
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { MonacoBinding } from 'y-monaco'

import React, { useEffect, useMemo, useState } from 'react'
import Editor from '@monaco-editor/react'

const roomname = `monaco-react-demo-${new Date().toLocaleDateString('en-CA')}`

function App() {
  const ydoc = useMemo(() => new Y.Doc(), [])
  const [editor, setEditor] = useState<any | null>(null)
  const [provider, setProvider] = useState<WebsocketProvider | null>(null)
  const [binding, setBinding] = useState<MonacoBinding | null>(null)
  const [connected, setConnected] = useState(false)
  const [peers, setPeers] = useState(1)

  // 初始化 provider
  useEffect(() => {
    const provider = new WebsocketProvider('wss://demos.yjs.dev/ws', roomname, ydoc)
    setProvider(provider)

    provider.on('status', (event: any) => {
      setConnected(event.status === 'connected')
    })

    // awareness 监听在线人数
    const awareness = provider.awareness
    const updatePeers = () => {
      setPeers(awareness.getStates().size)
    }
    awareness.on('change', updatePeers)

    return () => {
      awareness.off('change', updatePeers)
      provider.destroy()
      ydoc.destroy()
    }
  }, [ydoc])

  // 绑定 Monaco
  useEffect(() => {
    if (!provider || !editor) return
    const type = ydoc.getText('monaco')
    const binding = new MonacoBinding(type, editor.getModel()!, new Set([editor]), provider.awareness)
    setBinding(binding)

    return () => binding.destroy()
  }, [ydoc, provider, editor])

  // 清空文档
  const clearDoc = () => {
    const type = ydoc.getText('monaco')
    type.delete(0, type.length)
  }

  // 连接/断开 WebSocket
  const toggleConnection = () => {
    if (!provider) return
    if (connected) provider.disconnect()
    else provider.connect()
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between p-3 bg-gray-100 border-b">
        <div className="flex items-center gap-3">
          <button
            onClick={clearDoc}
            className="px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white"
          >
            清空文档
          </button>
          <button
            onClick={toggleConnection}
            className={`px-3 py-1 rounded ${
              connected ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
            } text-white`}
          >
            {connected ? '断开连接' : '重新连接'}
          </button>
        </div>
        <div className="text-sm text-gray-600">
          房间：<span className="font-mono text-gray-800">{roomname}</span> | 在线人数：{peers}
        </div>
      </div>

      {/* 编辑器 */}
      <div className="flex-1">
        <Editor
          height="90vh"
          defaultValue="// 实时协作编辑器已就绪"
          defaultLanguage="javascript"
          theme="vs-dark"
          onMount={(editor) => setEditor(editor)}
        />
      </div>
    </div>
  )
}

export default App
