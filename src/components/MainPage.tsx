// MainPage.tsx
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { FileOutlined, UserOutlined } from '@ant-design/icons';
import { Layout, Modal, message, type MenuProps } from 'antd';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';

import SiderMenu from './SiderMenu';
import HomeHeader from './HomeHeader';
import { ContentWithEditorAndPreview } from './ContentWithEditorAndPreview';
import styles from '../components.module.less';
import { useNavigate } from 'react-router-dom';
import type { OnMount } from '@monaco-editor/react';
import {
    fetchRooms,
    getContent,
    getEditPermission,
    getReadPermission,
    type Room,
    saveContent,
} from '../services/mainPage.ts';

// ---- helper types ----
type AntdMenuItem = Required<MenuProps>['items'][number];

export type SiderMenuItem = AntdMenuItem & {
    label?: React.ReactNode;
    children?: SiderMenuItem[];
};

function getItem(
    label: React.ReactNode,
    key: React.Key,
    icon?: React.ReactNode,
    children?: SiderMenuItem[],
): SiderMenuItem {
    return { label, key, icon, children } as SiderMenuItem;
}

// LRU cache max
const MAX_MODEL_CACHE = 50;

const MainPage: React.FC = () => {
    const userId = localStorage.getItem('userId');

    // Sider & rooms
    const [rooms, setRooms] = useState<Room[]>([]);
    const [menuLoading, setMenuLoading] = useState<boolean>(true);
    const [collapsed, setCollapsed] = useState(false);
    const [mode, setMode] = useState<'user' | 'room'>('room');
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [searchText, setSearchText] = useState('');

    // Editor / preview
    const [editorText, setEditorText] = useState('# 欢迎使用共享文档');
    const [showPreview, setShowPreview] = useState(false);

    // Monaco / Yjs refs
    const editorRef = useRef<any | null>(null);
    const monacoRef = useRef<any | null>(null);
    const ydocRef = useRef<Y.Doc | null>(null);
    const providerRef = useRef<WebsocketProvider | null>(null);
    const bindingRef = useRef<any | null>(null);
    const modelCacheRef = useRef<Map<string, any>>(new Map());

    // Connection & peers
    const [loading, setLoading] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting' | null>(null);
    const [connectedRoom, setConnectedRoom] = useState<string | null>(null);
    const [peers, setPeers] = useState<number>(0);

    // Permission
    const [hasAccess, setHasAccess] = useState<boolean>(true);
    const [editingEnabled, setEditingEnabled] = useState<boolean>(false);

    const switchCounterRef = useRef(0);
    const navigate = useNavigate();

    // -------------------- utils --------------------

    const fetchMenuData = async () => {
        try {
            setMenuLoading(true);
            const res = await fetchRooms(userId);
            setRooms(res);
        } catch (e) {
            console.error(e);
            message.error('加载文档列表失败');
        } finally {
            setMenuLoading(false);
        }
    };

    useEffect(() => {
        fetchMenuData();
        setSelectedRoom('');
    }, []);

    const getOrCreateUserId = () => {
        const key = 'collab-user-id';
        try {
            let id = localStorage.getItem(key);
            if (!id) {
                id = `uid-${Math.random().toString(36).slice(2, 10)}`;
                localStorage.setItem(key, id);
            }
            return id;
        } catch {
            return `uid-${Math.random().toString(36).slice(2, 10)}`;
        }
    };
    const userIdRef = useRef<string>(getOrCreateUserId());
    const displayName = localStorage.getItem('username') || localStorage.getItem('email') || 'User';
    const avatarInitial = displayName.charAt(0).toUpperCase();
    const avatarColor = (s: string) => {
        let h = 0;
        for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
        return `hsl(${Math.abs(h) % 360} 70% 45%)`;
    };

    // -------------------- cleanup --------------------
    const cleanupCollab = () => {
        try {
            bindingRef.current?.destroy?.();
            providerRef.current?.disconnect?.();
            providerRef.current?.destroy?.();
            ydocRef.current?.destroy?.();
            bindingRef.current = null;
            providerRef.current = null;
            ydocRef.current = null;
            setConnectionStatus(null);
            setPeers(0);
        } catch (e) {
            console.error('cleanupCollab error', e);
        }
    };

    const ensureModelCacheLimit = () => {
        try {
            const cache = modelCacheRef.current;
            while (cache.size > MAX_MODEL_CACHE) {
                const oldestKey = cache.keys().next().value;
                const oldestModel = cache.get(oldestKey);
                oldestModel?.dispose?.();
                cache.delete(oldestKey);
            }
        } catch (e) {
            console.error('ensureModelCacheLimit error', e);
        }
    };

    // -------------------- attach room --------------------
    const attachToRoom = async (roomId: string) => {
        const monaco = monacoRef.current;
        const editor = editorRef.current;
        if (!monaco || !editor) return;
        if (connectedRoom === roomId) return;

        const mySwitch = ++switchCounterRef.current;
        setLoading(true);
        setConnectionStatus('connecting');

        cleanupCollab();

        try {
            const uriStr = `inmemory://model/${encodeURIComponent(roomId)}.md`;
            const uri = monaco.Uri.parse(uriStr);
            let model = monaco.editor.getModel(uri);
            if (!model) model = monaco.editor.createModel('# 新文档\n', 'markdown', uri);

            const cache = modelCacheRef.current;
            if (cache.has(roomId)) cache.delete(roomId);
            cache.set(roomId, model);
            ensureModelCacheLimit();
            editor.setModel(model);
            editor.updateOptions?.({ readOnly: true });
            setEditingEnabled(false);

            // fetch backend content first
            const res = await getContent(roomId);
            const backendContent = res?.content ?? '# 新文档\n';
            model.setValue(backendContent);

            if (mySwitch !== switchCounterRef.current) {
                setLoading(false);
                return;
            }

            // init Yjs
            const ydoc = new Y.Doc();
            const provider = new WebsocketProvider('ws://localhost:1234', roomId, ydoc);
            ydocRef.current = ydoc;
            providerRef.current = provider;

            provider.awareness.setLocalStateField('user', {
                id: userIdRef.current,
                name: userIdRef.current,
                color: '#8ab4f8',
            });

            provider.on?.('status', (ev: any) => {
                setConnectionStatus(ev.status);
                if (ev.status === 'connected') {
                    const yText = ydoc.getText('monaco');
                    if (yText.length === 0) {
                        yText.insert(0, model.getValue()); // 将后端内容初始化到 yText
                    }
                }
            });

            const yText = ydoc.getText('monaco');
            const binding = new MonacoBinding(yText, model, new Set([editor]), provider.awareness);
            bindingRef.current = binding;

            // observe yText -> update preview
            const onYText = () => setEditorText(yText.toString());
            yText.observe?.(onYText);

            // awareness -> peers
            const onAwarenessChange = () => {
                const states = provider.awareness.getStates();
                setPeers(states ? states.size : 0);
            };
            provider.awareness.on?.('change', onAwarenessChange);
            onAwarenessChange();

            setConnectedRoom(roomId);
            setLoading(false);
        } catch (e) {
            console.error('attachToRoom error', e);
            setLoading(false);
            setConnectionStatus('disconnected');
        }
    };

    // -------------------- editor mount --------------------
    const handleEditorMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
    };

    // -------------------- edit / save --------------------
    const handleEditButtonClick = async () => {
        if (!selectedRoom) return;
        const ok = await checkEditPermission(selectedRoom, userId);
        if (!ok) {
            Modal.warning({ title: '权限不足', content: '你没有该文档的编辑权限' });
            editorRef.current?.updateOptions?.({ readOnly: true });
            setEditingEnabled(false);
            return;
        }
        editorRef.current?.updateOptions?.({ readOnly: false });
        editorRef.current?.focus?.();
        setEditingEnabled(true);
    };

    const handleSaveButtonClick = async () => {
        if (!selectedRoom || !ydocRef.current) return;
        try {
            const yText = ydocRef.current.getText('monaco');
            const content = yText.toString(); // 可替换为 encodeStateAsUpdate(ydocRef.current) 序列化
            await saveContent({ room_id: selectedRoom, content });
            message.success('保存成功');
        } catch (e) {
            console.error('saveContent error', e);
            message.error('保存失败');
        }
    };

    // -------------------- permissions --------------------
    const checkViewPermission = async (roomId: string | null): Promise<boolean> => {
        if (!roomId) return false;
        try {
            const res = await getReadPermission(roomId, userId);
            console.log('view', res);
            return !!res;
        } catch {
            return false;
        }
    };
    const checkEditPermission = async (roomId: string | null, userId?: string): Promise<boolean> => {
        if (!roomId) return false;
        try {
            const res = await getEditPermission(roomId, userId);
            console.log('edit', res);
            return !!res;
        } catch {
            return false;
        }
    };

    // -------------------- watch selectedRoom --------------------
    useEffect(() => {
        if (!selectedRoom) {
            cleanupCollab();
            setConnectedRoom(null);
            setHasAccess(true);
            setEditingEnabled(false);
            return;
        }

        (async () => {
            const ok = await checkViewPermission(selectedRoom, userId);
            setHasAccess(ok);
            if (!ok) {
                cleanupCollab();
                setConnectedRoom(null);
                setLoading(false);
                setEditingEnabled(false);
                return;
            }
            attachToRoom(selectedRoom);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedRoom]);

    // -------------------- cleanup --------------------
    useEffect(() => {
        return () => {
            cleanupCollab();
            modelCacheRef.current.forEach((m) => m.dispose?.());
            modelCacheRef.current.clear();
        };
    }, []);

    // -------------------- SiderMenu props --------------------
    const groupRoomsByUser = (rooms: Room[]): SiderMenuItem[] => {
        const map = new Map<string, Room[]>();
        rooms.forEach((room) => {
            if (!map.has(room.owner_user_name)) map.set(room.owner_user_name, []);
            map.get(room.owner_user_name)!.push(room);
        });
        const items: SiderMenuItem[] = [];
        map.forEach((rooms, username) => {
            const children = rooms.map((room) => getItem(room.room_name, `room-${room.room_id}`));
            items.push(getItem(username, `user-${username}`, <UserOutlined />, children));
        });
        return items;
    };

    const mapRoomsToMenuItems = (rooms: Room[]): SiderMenuItem[] => {
        return rooms.map((room) => getItem(room.room_name, `room-${room.room_id}`, <FileOutlined />));
    };

    const filteredItems = useMemo(() => {
        const filterMenu = (items: SiderMenuItem[]): SiderMenuItem[] =>
            items
                .map((item) => {
                    if (item?.children) {
                        const filteredChildren = filterMenu(item.children);
                        if (filteredChildren.length > 0 || String(item.label).toLowerCase().includes(searchText.toLowerCase()))
                            return { ...item, children: filteredChildren };
                        return null;
                    }
                    return String(item.label).toLowerCase().includes(searchText.toLowerCase()) ? item : null;
                })
                .filter(Boolean) as SiderMenuItem[];
        return filterMenu(mode === 'user' ? groupRoomsByUser(rooms) : mapRoomsToMenuItems(rooms));
    }, [searchText, mode, rooms]);

    const siderMenuProps = {
        collapsed,
        onCollapse: (value: boolean) => setCollapsed(value),
        mode,
        setMode,
        searchText,
        setSearchText,
        filteredItems,
        setSelectedRoom,
    };

    const contentWithEditorAndPreviewProps = {
        editorText,
        showPreview,
        handleEditorMount,
        hasAccess,
        editingEnabled,
    };

    const accountMenuItems: MenuProps['items'] = [
        { key: 'docs', label: '个人文档管理' },
        { type: 'divider' },
        { key: 'logout', label: '退出登录' },
    ];

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
        avatarColor: avatarColor(displayName),
        accountMenuItems,
        handleAccountMenuClick: ({ key }: any) => {
            if (key === 'docs') navigate('../mydocs');
            else if (key === 'logout') {
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
        },
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <SiderMenu {...siderMenuProps} />
            <Layout style={{ flex: 1 }}>
                <HomeHeader {...homeHeaderProps} className={styles.header} />
                <ContentWithEditorAndPreview {...contentWithEditorAndPreviewProps} />
            </Layout>
        </Layout>
    );
};

export default MainPage;
