// MainPage.tsx
import React, {useState, useMemo, useEffect, useCallback, useRef} from 'react'
import {
    FileOutlined,
    UserOutlined,
} from '@ant-design/icons'
import {type MenuProps, message} from 'antd'
import {Layout, Modal} from 'antd'

import * as Y from 'yjs'
import {WebsocketProvider} from 'y-websocket'
import {MonacoBinding} from 'y-monaco'

import SiderMenu from './SiderMenu'
import HomeHeader from './HomeHeader'
import {ContentWithEditorAndPreview} from './ContentWithEditorAndPreview'
import styles from '../components.module.less'
import {useNavigate} from 'react-router-dom'
import type {OnMount} from '@monaco-editor/react'
import {
    fetchRooms,
    getContent,
    getEditPermission,
    getReadPermission,
    type Room,
    saveContent
} from "../services/mainPage.ts";

// ---- helper types ----
type AntdMenuItem = Required<MenuProps>['items'][number]

export type SiderMenuItem = AntdMenuItem & {
    label?: React.ReactNode
    children?: SiderMenuItem[]
}

function getItem(
    label: React.ReactNode,
    key: React.Key,
    icon?: React.ReactNode,
    children?: SiderMenuItem[],
): SiderMenuItem {
    return {label, key, icon, children} as SiderMenuItem
}

// LRU cache max
const MAX_MODEL_CACHE = 50

const MainPage: React.FC = () => {
    // userId
    const userId = localStorage.getItem('userId')
    // sider menu
    const [rooms, setRooms] = useState<Room[]>([])
    const [menuLoading, setMenuLoading] = useState<boolean>(true)
    const [collapsed, setCollapsed] = useState(false)
    const [mode, setMode] = useState<'user' | 'room'>('room')
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
    const [searchText, setSearchText] = useState('')

    // preview text (由 yText.observe 更新)
    const [editorText, setEditorText] = useState('# 欢迎使用共享文档')
    const [showPreview, setShowPreview] = useState(false)

    // shared doc
    const editorRef = useRef<any | null>(null)
    const monacoRef = useRef<any | null>(null)

    const ydocRef = useRef<Y.Doc | null>(null)
    const providerRef = useRef<WebsocketProvider | null>(null)
    const bindingRef = useRef<any | null>(null)

    const modelCacheRef = useRef<Map<string, any>>(new Map())

    // loading / conn / peers
    const [loading, setLoading] = useState(false)
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting' | null>(null)
    const [connectedRoom, setConnectedRoom] = useState<string | null>(null)
    const [peers, setPeers] = useState<number>(0)

    // permission state: whether current selectedRoom is viewable
    const [hasAccess, setHasAccess] = useState<boolean>(true)

    // editing enabled state (Monaco readOnly toggle)
    const [editingEnabled, setEditingEnabled] = useState<boolean>(false)

    // switch token
    const switchCounterRef = useRef(0)

    const navigate = useNavigate()

    //sider menu
    const groupRoomsByUser = (rooms: Room[]): SiderMenuItem[] => {
        const map = new Map<string, Room[]>()

        rooms.forEach(room => {
            if (!map.has(room.owner_user_name)) {
                map.set(room.owner_user_name, [])
            }
            map.get(room.owner_user_name)!.push(room)
        })

        const items: SiderMenuItem[] = []
        map.forEach((rooms, username) => {
            const children = rooms.map(room => getItem(room.room_name, `room-${room.room_id}`))
            const icon = <UserOutlined/>
            items.push(getItem(username, `user-${username}`, icon, children))
        })

        return items
    }

    const mapRoomsToMenuItems = (rooms: Room[]): SiderMenuItem[] => {
        return rooms.map(room => {
            return getItem(room.room_name, `room-${room.room_id}`, <FileOutlined/>)
        })
    }

    const fetchMenuData = async () => {
        try {
            setMenuLoading(true)
            const res = await fetchRooms(userId)
            console.log(res)
            setRooms(res)
        } catch (e) {
            console.error(e)
            message.error("加载文档列表失败")
        } finally {
            setMenuLoading(false)
        }
    }

    useEffect(() => {
        fetchMenuData()
        setSelectedRoom('')
    }, [])


    // stable user id & display name (for avatar)
    const getOrCreateUserId = () => {
        const key = 'collab-user-id'
        try {
            let id = localStorage.getItem(key)
            if (!id) {
                id = `uid-${Math.random().toString(36).slice(2, 10)}`
                localStorage.setItem(key, id)
            }
            return id
        } catch (e) {
            return `uid-${Math.random().toString(36).slice(2, 10)}`
        }
    }
    const userIdRef = useRef<string>(getOrCreateUserId())

    // display name (try to read from localStorage or fallback)
    const displayName = localStorage.getItem('username') || localStorage.getItem('email') || 'User'
    const avatarInitial = (displayName && String(displayName).charAt(0).toUpperCase()) || 'U'

    // color from name hash
    const avatarColor = (s: string) => {
        let h = 0
        for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i)
        const hue = Math.abs(h) % 360
        return `hsl(${hue} 70% 45%)`
    }

    // ========== Permissions placeholders ==========
    const checkViewPermission = async (roomId: string | null): boolean => {
        if (!roomId) return false
        try {
            const res = getReadPermission(roomId, userId)
            if (!res) return false
            return true
        } catch (e) {
            console.error(e)
            return false
        }
    }
    const checkEditPermission = async (roomId: string | null): boolean => {
        if (!roomId) return false
        try {
            const res = await getEditPermission(roomId, userId)
            console.log(res)
            if (!res) return false
            return true
        } catch (e) {
            console.error(e)
            return false
        }
    }

    // ========== helpers: cleanup, dispose ==========
    const cleanupCollab = () => {
        try {
            if (bindingRef.current) {
                try {
                    if (typeof bindingRef.current.destroy === 'function') bindingRef.current.destroy()
                } catch (e) {
                }
                bindingRef.current = null
            }
            if (providerRef.current) {
                try {
                    providerRef.current.disconnect && providerRef.current.disconnect()
                } catch (e) {
                }
                try {
                    if (typeof providerRef.current.destroy === 'function') providerRef.current.destroy()
                } catch (e) {
                }
                providerRef.current = null
            }
            if (ydocRef.current) {
                try {
                    ydocRef.current.destroy && ydocRef.current.destroy()
                } catch (e) {
                }
                ydocRef.current = null
            }
            setConnectionStatus(null)
            setPeers(0)
        } catch (e) {
            console.error('cleanupCollab error', e)
        }
    }

    const disposeAllModels = () => {
        try {
            if (!monacoRef.current) return
            modelCacheRef.current.forEach((m) => {
                try {
                    m.dispose && m.dispose()
                } catch (e) {
                }
            })
            modelCacheRef.current.clear()
        } catch (e) {
            console.error('disposeAllModels error', e)
        }
    }

    const ensureModelCacheLimit = () => {
        try {
            const cache = modelCacheRef.current
            while (cache.size > MAX_MODEL_CACHE) {
                const oldestKey = cache.keys().next().value
                const oldestModel = cache.get(typeof oldestKey === "string" ? oldestKey : '')
                try {
                    oldestModel.dispose && oldestModel.dispose()
                } catch (e) {
                }
                cache.delete(typeof oldestKey === "string" ? oldestKey : '')
            }
        } catch (e) {
            console.error('ensureModelCacheLimit error', e)
        }
    }

    // attachToRoom: create/use model, create ydoc/provider/binding, subscribe awareness & yText
    const attachToRoom = async (roomId: string) => {
        const monaco = monacoRef.current
        const editor = editorRef.current
        if (!monaco || !editor) return

        if (connectedRoom === roomId) return

        const mySwitch = ++switchCounterRef.current
        setLoading(true)
        setConnectionStatus('connecting')

        cleanupCollab()

        try {
            const uriStr = `inmemory://model/${encodeURIComponent(roomId)}.md`
            const uri = monaco.Uri.parse(uriStr)
            let model = monaco.editor.getModel(uri)
            if (!model) {
                model = monaco.editor.createModel('# 新文档\n', 'markdown', uri)
            }

            const cache = modelCacheRef.current
            if (cache.has(roomId)) cache.delete(roomId)
            cache.set(roomId, model)
            ensureModelCacheLimit()

            editor.setModel(model)
            // default readOnly until user clicks Edit and passes permission
            editor.updateOptions && editor.updateOptions({readOnly: true})
            setEditingEnabled(false)

            if (mySwitch !== switchCounterRef.current) {
                setLoading(false)
                return
            }

            const ydoc = new Y.Doc()
            const provider = new WebsocketProvider('ws://localhost:1234', roomId, ydoc)
            ydocRef.current = ydoc
            providerRef.current = provider

            try {
                provider.awareness.setLocalStateField('user', {
                    id: userIdRef.current,
                    name: userIdRef.current,
                    color: '#8ab4f8',
                })
            } catch (e) {
            }

            const onStatus = (ev: any) => {
                try {
                    setConnectionStatus(ev.status)
                    if (ev.status === 'connected') {
                        const yText = ydoc.getText('monaco')
                        if (yText.length === 0) {
                            try {
                                yText.insert(0, model.getValue())
                            } catch (e) {
                            }
                        }
                    }
                } catch (e) {
                }
            }
            try {
                if (typeof provider.on === 'function') provider.on('status', onStatus)
            } catch (e) {
            }

            const yText = ydoc.getText('monaco')
            const binding = new MonacoBinding(yText, model, new Set([editor]), provider.awareness)

            // observe yText -> update preview
            const onYText = () => {
                try {
                    setEditorText(yText.toString())
                } catch (e) {
                }
            }
            try {
                yText.observe && yText.observe(onYText)
            } catch (e) {
            }

            // awareness -> peers
            const onAwarenessChange = () => {
                try {
                    const states = provider.awareness.getStates()
                    setPeers(states ? states.size : 0)
                } catch (e) {
                    setPeers(0)
                }
            }
            try {
                provider.awareness.on && provider.awareness.on('change', onAwarenessChange)
                onAwarenessChange()
            } catch (e) {
            }

            if (mySwitch !== switchCounterRef.current) {
                try {
                    yText.unobserve && yText.unobserve(onYText)
                } catch (e) {
                }
                try {
                    binding.destroy && binding.destroy()
                } catch (e) {
                }
                try {
                    provider.disconnect && provider.disconnect()
                } catch (e) {
                }
                try {
                    ydoc.destroy && ydoc.destroy()
                } catch (e) {
                }
                setLoading(false)
                return
            }

            bindingRef.current = binding
            setConnectedRoom(roomId)
            setLoading(false)
        } catch (e) {
            console.error('attachToRoom error', e)
            setLoading(false)
            setConnectionStatus('disconnected')
        }
    }

    // handle editor mount
    const handleEditorMount: OnMount = (editor: any, monaco: any) => {
        editorRef.current = editor
        monacoRef.current = monaco

        if (selectedRoom) {
            // will be handled in useEffect
        }
    }

    // handle Edit button clicked from Content
    const handleEditButtonClick = () => {
        if (!selectedRoom) return
        const ok = checkEditPermission(selectedRoom, userId)
        if (!ok) {
            Modal.warning({
                title: '权限不足',
                content: '你没有该文档的编辑权限，无法进行编辑。',
            })
            try {
                editorRef.current && editorRef.current.updateOptions && editorRef.current.updateOptions({readOnly: true})
            } catch (e) {
            }
            setEditingEnabled(false)
            return
        }
        // enable editing
        try {
            editorRef.current && editorRef.current.updateOptions && editorRef.current.updateOptions({readOnly: false})
            editorRef.current && editorRef.current.focus && editorRef.current.focus()
        } catch (e) {
        }
        setEditingEnabled(true)
    }

    // handle Save button click: call stub saveDocument
    const handleSaveButtonClick = async () => {
        try {
            const res = saveContent({room_id: selectedRoom, content: ydocRef.current?.getText('monaco')})
            console.log(res)
            message.success('保存成功')
        } catch (e) {
            console.error('saveContent error', e)
            message.error('保存失败')
        }
    }

    // watch selectedRoom changes -> check view permission first then attach or show overlay
    useEffect(() => {
        if (!monacoRef.current || !editorRef.current) {
            // still not mounted: still update permission state (sync)
            if (selectedRoom === null) {
                setHasAccess(true)
            } else {
                setHasAccess(checkViewPermission(selectedRoom, userId))
            }
            return
        }

        if (!selectedRoom) {
            // no room selected -> cleanup and show placeholder
            cleanupCollab()
            const monaco = monacoRef.current
            const editor = editorRef.current
            const uri = monaco.Uri.parse('inmemory://model/unselected.md')
            let model = monaco.editor.getModel(uri)
            if (!model) model = monaco.editor.createModel('<!-- No document selected -->', 'markdown', uri)
            editor.setModel(model)
            setConnectedRoom(null)
            setHasAccess(true)
            setEditingEnabled(false)
            return
        }

        // check view permission sync placeholder
        const ok = checkViewPermission(selectedRoom, userId)
        setHasAccess(ok)
        if (!ok) {
            // don't attach; cleanup any previous collab
            cleanupCollab()
            setConnectedRoom(null)
            setLoading(false)
            setEditingEnabled(false)
            return
        }

        // has view access -> attach
        if (selectedRoom === connectedRoom) return
        attachToRoom(selectedRoom)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedRoom])

    // cleanup on unmount
    useEffect(() => {
        return () => {
            cleanupCollab()
            disposeAllModels()
        }

    }, [])

    // menu filtering (unchanged)
    const filteredItems = useMemo(() => {
        const filterMenu = (items: SiderMenuItem[]): SiderMenuItem[] =>
            items
                .map((item) => {
                    if (item?.children) {
                        const filteredChildren = filterMenu(item.children)
                        if (
                            filteredChildren.length > 0 ||
                            String(item.label).toLowerCase().includes(searchText.toLowerCase())
                        ) {
                            return {...item, children: filteredChildren}
                        }
                        return null
                    }
                    return String(item.label).toLowerCase().includes(searchText.toLowerCase()) ? item : null
                })
                .filter(Boolean) as SiderMenuItem[]

        return filterMenu(mode === 'user' ? groupRoomsByUser(rooms) : mapRoomsToMenuItems(rooms))
    }, [searchText, mode, rooms])

    // account menu click
    const handleAccountMenuClick = useCallback(({key}: { key: string }) => {
        if (key === 'docs') {
            navigate('../mydocs')
        } else if (key === 'logout') {
            localStorage.removeItem('token')
            window.location.href = '/login'
        }
    }, [navigate])

    const initRoomContent = async () => {
        if (!selectedRoom || !monacoRef.current || !editorRef.current) return

        try {
            const res = await getContent(selectedRoom)
            console.log(res)
            const content = res?.content ?? '# 新文档\n'

            const monaco = monacoRef.current
            const editor = editorRef.current

            const uri = monaco.Uri.parse(
                `inmemory://model/${encodeURIComponent(selectedRoom)}.md`
            )
            let model = monaco.editor.getModel(uri)

            if (!model) {
                model = monaco.editor.createModel(content, 'markdown', uri)
            } else {
                model.setValue(content)
            }

            editor.setModel(model)
            setEditorText(content)
        } catch (err) {
            console.error('initRoomContent error:', err)
            message.error('加载文档内容失败')
        }
    }

    // props for SiderMenu
    const siderMenuProps = {
        collapsed,
        onCollapse: (value: boolean) => setCollapsed(value),
        mode,
        setMode,
        searchText,
        setSearchText,
        filteredItems,
        setSelectedRoom,
        initRoomContent
    }

    // props for ContentWithEditorAndPreview
    const contentWithEditorAndPreviewProps = {
        editorText,
        showPreview,
        handleEditorMount,
        hasAccess,
        editingEnabled,
    }

    const accountMenuItems: MenuProps['items'] = [
        {key: 'docs', label: '个人文档管理'},
        {type: 'divider'},
        {key: 'logout', label: '退出登录'},
    ]

    // HomeHeader props object — use spread when rendering
    const homeHeaderProps = {
        title: 'Markdown 实时协作编辑器',
        selectedRoom,
        connectionStatus,
        peers,
        showPreview,
        setShowPreview,
        hasAccess,
        onEditClick: handleEditButtonClick,
        onSaveClick: handleSaveButtonClick,
        editingEnabled,
        avatarInitial,
        avatarColor: avatarColor(String(displayName)),
        accountMenuItems,
        handleAccountMenuClick,
    }

    return (
        <Layout style={{minHeight: '100vh'}}>
            <SiderMenu {...siderMenuProps} />

            <Layout style={{flex: 1}}>
                {/* Use HomeHeader with spread props */}
                <HomeHeader {...homeHeaderProps} className={styles.header}/>

                {/* Main content area */}
                <ContentWithEditorAndPreview {...contentWithEditorAndPreviewProps} />
            </Layout>
        </Layout>
    )
}

export default MainPage
