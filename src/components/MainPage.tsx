import React, { useState, useMemo, useEffect } from 'react'
import {
  DesktopOutlined,
  FileOutlined,
  PieChartOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { Layout, theme } from 'antd'

import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { MonacoBinding } from 'y-monaco'

import SiderMenu from './SiderMenu'
import {CreateNewDocForm, ContentWithEditorAndPreview} from './ContentWithEditorAndPreview'
import styles from '../components.module.less'

type MenuItem = Required<MenuProps>['items'][number]

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[],
): MenuItem {
  return { label, key, icon, children } as MenuItem
}

const userItems: MenuItem[] = [
  getItem('Yaocheng', 'user-1', <UserOutlined />, [
    getItem('GuizhouHome', 'room-1'),
    getItem('ZhejiangHome', 'room-2'),
  ]),
  getItem('Xiaoyang', 'user-2', <TeamOutlined />, [
    getItem('ShaanxiHome', 'room-3'),
  ]),
]

const roomItems: MenuItem[] = [
  getItem('GuizhouHome', 'room-1', <DesktopOutlined />),
  getItem('ZhejiangHome', 'room-2', <PieChartOutlined />),
  getItem('ShaanxiHome', 'room-3', <FileOutlined />),
]

const MainPage: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [mode, setMode] = useState<'user' | 'room'>('room')
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [editorText, setEditorText] = useState('# 共享家园准备完毕')
  const [searchText, setSearchText] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  // shared doc
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null)
  const [provider, setProvider] = useState<WebsocketProvider | null>(null)
  const [binding, setBinding] = useState<MonacoBinding | null>(null)
  const [editor, setEditor] = useState<any | null>(null)
  const [connected, setConnected] = useState(false)
  const [peers, setPeers] = useState<number>(1)

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  useEffect(() => {
    if (!selectedRoom) return

    // destroy old
    binding?.destroy()
    provider?.destroy()
    ydoc?.destroy()

    // create Y.Doc for new room
    const newYdoc = new Y.Doc()
    setYdoc(newYdoc)

    // create new provider
    const newProvider = new WebsocketProvider('ws://localhost:1234', selectedRoom, newYdoc)
    setProvider(newProvider)

    // set user status
    newProvider.awareness.setLocalStateField('user', {
      // 先随机在一个范围内生成name和color，后续接入后端读取name，随机分配一个color
      name: `User-${Math.floor(Math.random() * 10000)}`,
      color: '#' + Math.floor(Math.random() * 16777215).toString(16)
    })

    // bind editor
    let newBinding: MonacoBinding | null = null
    if(editor) {
      const type = newYdoc.getText('monaco')
      newBinding = new MonacoBinding(type, editor.getModel()!, new Set([editor]), newProvider.awareness)
      setBinding(newBinding)

      type.observe(() => {
        setEditorText(type.toString())
      })
    }

    // listen to peers
    const handleAwarenessChange = () => {
      const states = Array.from(newProvider.awareness.getStates().values())
      console.log(states)
      setPeers(states.length)
    }
    newProvider.awareness.on('change', handleAwarenessChange)

    handleAwarenessChange()

  }, [selectedRoom, editor])

  // useEffect(() => {
  //   const provider = new WebsocketProvider(`ws://localhost:1234`, selectedKey, ydoc)
  //   setProvider(provider)

  //   provider.on('status', (event: any) => {
  //     setConnected(event.status === 'connected')
  //   })

  //   // awareness 监听在线人数
  //   const awareness = provider.awareness
  //   const localUser = {
  //     name: `User-${Math.floor(Math.random() * 10000)}`,
  //     // 你可以加颜色、id、cursor 等
  //     color: '#' + Math.floor(Math.random() * 16777215).toString(16)
  //   }
  //   awareness.setLocalStateField('user', localUser)
  //   const updatePeers = () => {
  //     setPeers(awareness.getStates().size)
  //   }
  //   awareness.on('change', updatePeers)

  //   updatePeers()
  //   return () => {
  //     awareness.setLocalState(null)
  //     awareness.off('change', updatePeers)
  //     provider.destroy()
  //     ydoc.destroy()
  //   }
  // }, [ydoc])

  // useEffect(() => {
  //   if (!provider || !editor) return
  //   const type = ydoc.getText('monaco')
  //   const binding = new MonacoBinding(type, editor.getModel()!, new Set([editor]), provider.awareness)
  //   setBinding(binding)

  //   editor.onDidChangeModelContent(() => {
  //     setEditorText(editor.getValue())
  //   })

  //   return () => binding.destroy()
  // }, [ydoc, provider, editor])

  // useEffect(() => {
  //   if (!provider) return

  //   const awareness = provider.awareness

  //   const handleUnload = () => {
  //     // 通知其他人“我走了”
  //     awareness.setLocalState(null)
  //   }

  //   window.addEventListener('beforeunload', handleUnload)

  //   return () => {
  //     window.removeEventListener('beforeunload', handleUnload)
  //   }
  // }, [provider])



  const filteredItems = useMemo(() => {
    const filterMenu = (items: MenuItem[]): MenuItem[] =>
      items
        .map((item) => {
          if (item?.children) {
            const filteredChildren = filterMenu(item.children)
            if (
              filteredChildren.length > 0 ||
              String(item.label).toLowerCase().includes(searchText.toLowerCase())
            ) {
              return { ...item, children: filteredChildren }
            }
            return null
          }
          return String(item.label).toLowerCase().includes(searchText.toLowerCase())
            ? item
            : null
        })
        .filter(Boolean) as MenuItem[]

    return filterMenu(mode === 'user' ? userItems : roomItems)
  }, [searchText, mode])

  const siderMenuProps = {
    collapsed,
    onCollapse: (value: boolean) => setCollapsed(value),
    mode,
    setMode,
    searchText,
    setSearchText,
    filteredItems,
    setSelectedRoom,
  }

  const contentWithEditorAndPreviewProps = {
    editorText,
    setEditor,
    selectedRoom,
    showPreview,
    setShowPreview,
    colorBgContainer,
    borderRadiusLG,
    peers
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* ------------------ SIDER ------------------ */}
      <SiderMenu {...siderMenuProps} />

      {/* ------------------ MAIN AREA ------------------ */}
      <Layout style={{ flex: 1 }}>
        {/* 顶部 Header */}
        <Layout.Header className={styles.header}>
          <div style={{ fontWeight: 600 }}>Markdown 实时协作编辑器</div>
        </Layout.Header>

        {/* 主内容区 */}
        {selectedRoom ? <ContentWithEditorAndPreview {...contentWithEditorAndPreviewProps} /> : <CreateNewDocForm />}
        
        <Layout.Footer style={{ textAlign: 'center' }}>
          Ant Design ©{new Date().getFullYear()} Created by Ant UED
        </Layout.Footer>
      </Layout>
    </Layout>
  )
}

export default MainPage
