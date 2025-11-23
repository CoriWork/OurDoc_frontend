// MyDocsPage.tsx
import React, {useEffect, useMemo, useState} from 'react'
import {
    Layout,
    Menu,
    Card,
    Radio,
    Button,
    Modal,
    Input,
    List,
    Avatar,
    Space,
    message,
    Popconfirm,
    Table,
    Tag,
    Typography,
} from 'antd'
import type {MenuProps} from 'antd'
import {
    PlusOutlined,
    DeleteOutlined,
    UserAddOutlined,
    ExclamationCircleOutlined,
    EditOutlined,
    LeftOutlined
} from '@ant-design/icons'
import {useNavigate} from "react-router-dom";

const {Sider, Content} = Layout
const {Search} = Input
const {Text} = Typography

// ----------------- types -----------------
type DocVisibility = 'private' | 'everyone_edit' | 'everyone_read' | 'partial'

type DocumentItem = {
    id: string
    title: string
    createdAt: string
    visibility: DocVisibility
    // permissions only used when visibility === 'partial'
    permissions: Record<
        string,
        { userId: string; username: string; email: string; permission: 'edit' | 'read' }
    >
}

type User = {
    id: string
    username: string
    email: string
    avatarColor?: string
}

// ----------------- mock data (replace with API) -----------------
const mockUsers: User[] = [
    {id: 'u1', username: 'alice', email: 'alice@example.com', avatarColor: '#f56a00'},
    {id: 'u2', username: 'bob', email: 'bob@example.com', avatarColor: '#7265e6'},
    {id: 'u3', username: 'carol', email: 'carol@example.com', avatarColor: '#ffbf00'},
    {id: 'u4', username: 'david', email: 'david@example.com', avatarColor: '#00a2ae'},
    {id: 'u5', username: 'eve', email: 'eve@example.com', avatarColor: '#7fbf7f'},
]

const mockDocsInitial: DocumentItem[] = [
    {
        id: 'doc-1',
        title: '家庭计划',
        createdAt: '2025-01-10',
        visibility: 'partial',
        permissions: {
            u1: {userId: 'u1', username: 'alice', email: 'alice@example.com', permission: 'edit'},
            u2: {userId: 'u2', username: 'bob', email: 'bob@example.com', permission: 'read'},
        },
    },
    {
        id: 'doc-2',
        title: '项目说明',
        createdAt: '2025-02-20',
        visibility: 'everyone_read',
        permissions: {},
    },
    {
        id: 'doc-3',
        title: '私人笔记',
        createdAt: '2025-03-05',
        visibility: 'private',
        permissions: {},
    },
]

// ----------------- Component -----------------
const MyDocsPage: React.FC = () => {
    // navigate
    const navigate = useNavigate()
    // docs state (would normally come from API)
    const [docs, setDocs] = useState<DocumentItem[]>([])
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null)

    // modal & user search state
    const [addUserModalVisible, setAddUserModalVisible] = useState(false)
    const [userSearchText, setUserSearchText] = useState('')
    const [selectedUsersInModal, setSelectedUsersInModal] = useState<
        Array<{ user: User; permission: 'edit' | 'read' }>
    >([])

    // rename modal state
    const [renameModalVisible, setRenameModalVisible] = useState(false)
    const [renameValue, setRenameValue] = useState('')

    // simulate list of all users (would normally come from API)
    const [allUsers, setAllUsers] = useState<User[]>([])

    useEffect(() => {
        // load mocks
        setDocs(mockDocsInitial)
        setAllUsers(mockUsers)
        setSelectedDocId(mockDocsInitial[0]?.id ?? null)
    }, [])

    const selectedDoc = useMemo(
        () => docs.find((d) => d.id === selectedDocId) ?? null,
        [docs, selectedDocId],
    )

    // ----- handlers for visibility -----
    const handleVisibilityChange = (val: DocVisibility) => {
        if (!selectedDoc) return
        const newDocs = docs.map((d) =>
            d.id === selectedDoc.id ? {...d, visibility: val} : d,
        )
        setDocs(newDocs)
        // api:向后端同步
        message.success('保存可见性设置')
    }

    // ----- permissions helper functions -----
    const listPermissions = selectedDoc
        //因为permissions是一个Record[]，所以values提取出Record的所有的键值对的值
        ? Object.values(selectedDoc.permissions).sort((a, b) =>
            a.username.localeCompare(b.username),
        )
        : []

    const handleRemovePermission = (userId: string) => {
        if (!selectedDoc) return
        const newPermissions = {...selectedDoc.permissions}
        delete newPermissions[userId]
        const newDocs = docs.map((d) =>
            d.id === selectedDoc.id ? {...d, permissions: newPermissions} : d,
        )
        setDocs(newDocs)
        message.success('已移除该用户权限')
    }

    const handleChangePermission = (userId: string, permission: 'edit' | 'read') => {
        if (!selectedDoc) return
        const newPermissions = {
            ...selectedDoc.permissions,
            [userId]: {...(selectedDoc.permissions[userId] || {userId, username: '', email: ''}), permission},
        }
        // ensure username/email filled from allUsers
        const u = allUsers.find((x) => x.id === userId)
        if (u) {
            newPermissions[userId].username = u.username
            newPermissions[userId].email = u.email
        }
        const newDocs = docs.map((d) =>
            d.id === selectedDoc.id ? {...d, permissions: newPermissions} : d,
        )
        setDocs(newDocs)
        message.success('权限修改成功')
    }

    // ----- add users modal logic -----
    const openAddUsers = () => {
        setSelectedUsersInModal([])
        setUserSearchText('')
        setAddUserModalVisible(true)
    }

    const closeAddUsers = () => {
        setAddUserModalVisible(false)
    }

    const filteredUsersForModal = useMemo(() => {
        const q = userSearchText.trim().toLowerCase()
        if (!q) return allUsers
        return allUsers.filter(
            (u) => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
        )
    }, [allUsers, userSearchText])

    const toggleSelectUserInModal = (user: User) => {
        const exists = selectedUsersInModal.find((s) => s.user.id === user.id)
        if (exists) {
            setSelectedUsersInModal((prev) => prev.filter((s) => s.user.id !== user.id))
        } else {
            setSelectedUsersInModal((prev) => [...prev, {user, permission: 'read'}])
        }
    }

    const setPermissionForSelectedUser = (userId: string, permission: 'edit' | 'read') => {
        setSelectedUsersInModal((prev) =>
            prev.map((p) => (p.user.id === userId ? {...p, permission} : p)),
        )
    }

    const handleAddUsersSubmit = () => {
        if (!selectedDoc) {
            message.error('请选择要添加权限的文档')
            return
        }
        if (selectedUsersInModal.length === 0) {
            message.warning('请先选择用户')
            return
        }
        const newPermissions = {...(selectedDoc.permissions || {})}
        selectedUsersInModal.forEach((s) => {
            newPermissions[s.user.id] = {
                userId: s.user.id,
                username: s.user.username,
                email: s.user.email,
                permission: s.permission,
            }
        })
        const newDocs = docs.map((d) =>
            d.id === selectedDoc.id ? {...d, permissions: newPermissions} : d,
        )
        setDocs(newDocs)
        setAddUserModalVisible(false)
        message.success('添加用户并设置权限成功')
    }

    // ----- rename logic -----
    const openRenameModal = () => {
        if (!selectedDoc) {
            message.warning('请选择要重命名的文档')
            return
        }
        setRenameValue(selectedDoc.title)
        setRenameModalVisible(true)
    }

    const closeRenameModal = () => {
        setRenameModalVisible(false)
        setRenameValue('')
    }

    const handleRenameSubmit = () => {
        if (!selectedDoc) return
        const newName = renameValue.trim()
        if (!newName) {
            message.warning('文档名称不能为空')
            return
        }
        // optional: check duplicate name in docs
        if (docs.some((d) => d.id !== selectedDoc.id && d.title === newName)) {
            message.error('已有同名文档，请换个名字')
            return
        }
        const newDocs = docs.map((d) => (d.id === selectedDoc.id ? {...d, title: newName} : d))
        setDocs(newDocs)
        setRenameModalVisible(false)
        message.success('重命名成功')
    }

    // ----- delete document -----
    const handleDeleteDocument = (docId: string) => {
        setDocs((prev) => prev.filter((d) => d.id !== docId))
        message.success('删除文档成功')
        // pick another doc if any
        setSelectedDocId((prev) => {
            if (prev !== docId) return prev
            const remaining = docs.filter((d) => d.id !== docId)
            return remaining[0]?.id ?? null
        })
    }

    // ----- UI render helpers -----
    const menuItems: MenuProps['items'] = docs.map((d) => ({
        key: d.id,
        label: d.title,
    }))

    const permissionColumns = [
        {
            title: '用户',
            dataIndex: 'username',
            key: 'username',
            render: (_: any, record: any) => (
                <Space>
                    <Avatar style={{backgroundColor: '#87d068'}}>
                        {String(record.username || record.email || '?').charAt(0).toUpperCase()}
                    </Avatar>
                    <div>
                        <div>{record.username}</div>
                        <div style={{color: '#999', fontSize: 12}}>{record.email}</div>
                    </div>
                </Space>
            ),
        },
        {
            title: '权限',
            dataIndex: 'permission',
            key: 'permission',
            width: 240,
            render: (_: any, record: any) => (
                <Space>
                    <Button
                        size="small"
                        type={record.permission === 'edit' ? 'primary' : 'default'}
                        onClick={() => handleChangePermission(record.userId, 'edit')}
                    >
                        可编辑
                    </Button>
                    <Button
                        size="small"
                        type={record.permission === 'read' ? 'primary' : 'default'}
                        onClick={() => handleChangePermission(record.userId, 'read')}
                    >
                        只读
                    </Button>
                </Space>
            ),
        },
        {
            title: '操作',
            key: 'op',
            width: 120,
            render: (_: any, record: any) => (
                <Popconfirm
                    title={`确认移除 ${record.username} 的权限吗？`}
                    onConfirm={() => handleRemovePermission(record.userId)}
                >
                    <Button danger size="small" icon={<DeleteOutlined/>}>
                        移除
                    </Button>
                </Popconfirm>
            ),
        },
    ]

    return (
        <Layout style={{height: '100%'}}>
            <Sider width={320} style={{background: '#fff'}}>
                <div style={{padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div style={{fontWeight: 600}}>我的文档</div>
                    <Button
                        icon={<PlusOutlined/>}
                        type="primary"
                        onClick={() => {
                            // create a new doc quickly
                            const newDoc: DocumentItem = {
                                id: `doc-${Date.now()}`,
                                title: `新文档 ${docs.length + 1}`,
                                createdAt: new Date().toISOString(),
                                visibility: 'private',
                                permissions: {},
                            }
                            setDocs((prev) => [newDoc, ...prev])
                            setSelectedDocId(newDoc.id)
                            message.success('已创建新文档（临时）')
                        }}
                    >
                        新建
                    </Button>
                </div>

                <Menu
                    mode="inline"
                    selectedKeys={selectedDocId ? [selectedDocId] : []}
                    items={menuItems}
                    onClick={(info) => setSelectedDocId(String(info.key))}
                    style={{overflow: 'auto', borderRight: 0}}
                />
            </Sider>

            <Layout>
                <Content style={{padding: 24, minHeight: 280}}>
                    {!selectedDoc ? (
                        <Card>
                            <div>请选择左侧文档或创建新文档。</div>
                        </Card>
                    ) : (
                        <div style={{display: 'flex', gap: 16}}>
                            <div style={{flex: 1}}>
                                <Card
                                    title={selectedDoc.title}
                                    extra={
                                        <Space>
                                            <Button icon={<EditOutlined/>} onClick={openRenameModal}>
                                                重命名
                                            </Button>
                                        </Space>
                                    }
                                    style={{marginBottom: 16}}
                                >
                                    <div style={{marginBottom: 12}}>
                                        <Text strong>公开性</Text>
                                    </div>

                                    <Radio.Group
                                        onChange={(e) => handleVisibilityChange(e.target.value)}
                                        value={selectedDoc.visibility}
                                    >
                                        <Space direction="vertical">
                                            <Radio value="private">私密（仅我可见）</Radio>
                                            <Radio value="everyone_edit">所有人可编辑</Radio>
                                            <Radio value="everyone_read">所有人可阅读</Radio>
                                            <Radio value="partial">部分人可见 / 可编辑</Radio>
                                        </Space>
                                    </Radio.Group>

                                    {selectedDoc.visibility === 'partial' && (
                                        <div style={{marginTop: 20}}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: 12
                                            }}>
                                                <div>
                                                    <Text strong>已授权用户</Text>
                                                    <div
                                                        style={{color: '#888', fontSize: 12}}>以下用户有该文档的访问权限
                                                    </div>
                                                </div>

                                                <Space>
                                                    <Button icon={<UserAddOutlined/>} onClick={openAddUsers}>
                                                        添加用户
                                                    </Button>
                                                </Space>
                                            </div>

                                            <Table
                                                rowKey="userId"
                                                dataSource={listPermissions}
                                                columns={permissionColumns}
                                                pagination={false}
                                                locale={{emptyText: '当前没有已授权用户'}}
                                            />
                                        </div>
                                    )}
                                </Card>

                                <Card title="危险操作">
                                    <Space direction="vertical">
                                        <Popconfirm
                                            title="确认删除该文档？此操作无法撤销。"
                                            icon={<ExclamationCircleOutlined/>}
                                            onConfirm={() => handleDeleteDocument(selectedDoc.id)}
                                        >
                                            <Button danger icon={<DeleteOutlined/>}>
                                                删除文档
                                            </Button>
                                        </Popconfirm>
                                    </Space>
                                </Card>
                            </div>

                            {/* 右侧简要信息列 */}
                            <div style={{width: 320}}>
                                <Card title="文档信息">
                                    <div>
                                        <div><Text type="secondary">ID</Text></div>
                                        <div style={{marginBottom: 8}}>{selectedDoc.id}</div>

                                        <div><Text type="secondary">创建时间</Text></div>
                                        <div style={{marginBottom: 8}}>{selectedDoc.createdAt}</div>

                                        <div><Text type="secondary">当前公开性</Text></div>
                                        <div style={{marginBottom: 8}}>
                                            <Tag>
                                                {selectedDoc.visibility === 'private' && '私密'}
                                                {selectedDoc.visibility === 'everyone_edit' && '所有人可编辑'}
                                                {selectedDoc.visibility === 'everyone_read' && '所有人可阅读'}
                                                {selectedDoc.visibility === 'partial' && '部分人可见'}
                                            </Tag>
                                        </div>
                                    </div>
                                </Card>

                                <Button type={'primary'} size="middle" icon={<LeftOutlined/>}
                                        onClick={() => navigate('../home')}
                                        style={{
                                            width: '100%',        // 横向占满
                                            marginTop: 16,        // 与 Card 的间距
                                        }}
                                >
                                    返回
                                </Button>
                            </div>
                        </div>
                    )}
                </Content>
            </Layout>

            {/* Add Users Modal */}
            <Modal
                title="添加用户并设置权限"
                open={addUserModalVisible}
                onCancel={closeAddUsers}
                onOk={handleAddUsersSubmit}
                cancelText="取消"
                okText={`添加（${selectedUsersInModal.length}）`}
                width={800}
            >
                <div style={{display: 'flex', gap: 16}}>
                    {/* left: search + user list */}
                    <div style={{width: 320}}>
                        <Search
                            placeholder="搜索用户名或邮箱"
                            value={userSearchText}
                            onChange={(e) => setUserSearchText(e.target.value)}
                            allowClear
                            style={{marginBottom: 12}}
                        />
                        <List
                            size="small"
                            bordered
                            style={{maxHeight: 400, overflow: 'auto'}}
                            dataSource={filteredUsersForModal}
                            renderItem={(user) => {
                                const selected = selectedUsersInModal.some((s) => s.user.id === user.id)
                                // disable if user already in doc permissions
                                const alreadyHas = selectedDoc ? !!selectedDoc.permissions[user.id] : false
                                return (
                                    <List.Item
                                        style={{
                                            cursor: alreadyHas ? 'not-allowed' : 'pointer',
                                            opacity: alreadyHas ? 0.5 : 1
                                        }}
                                        onClick={() => {
                                            if (alreadyHas) {
                                                message.info('该用户已包含在已授权列表中')
                                                return
                                            }
                                            toggleSelectUserInModal(user)
                                        }}
                                    >
                                        <List.Item.Meta
                                            avatar={<Avatar
                                                style={{backgroundColor: '#7265e6'}}>{user.username.charAt(0).toUpperCase()}</Avatar>}
                                            title={<div>{user.username}</div>}
                                            description={<div style={{fontSize: 12}}>{user.email}</div>}
                                        />
                                        <div>
                                            {selected ? <Tag>已选择</Tag> : null}
                                        </div>
                                    </List.Item>
                                )
                            }}
                        />
                    </div>

                    {/* right: selected users with permission toggles */}
                    <div style={{flex: 1}}>
                        <div style={{marginBottom: 12}}>
                            <Text strong>将要添加的用户</Text>
                        </div>

                        <List
                            bordered
                            dataSource={selectedUsersInModal}
                            locale={{emptyText: '未选择用户'}}
                            renderItem={(item) => (
                                <List.Item
                                    style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <List.Item.Meta
                                        avatar={<Avatar>{item.user.username.charAt(0).toUpperCase()}</Avatar>}
                                        title={item.user.username}
                                        description={<div style={{fontSize: 12}}>{item.user.email}</div>}
                                    />
                                    <div>
                                        <Space>
                                            <Button
                                                size="small"
                                                type={item.permission === 'edit' ? 'primary' : 'default'}
                                                onClick={() => setPermissionForSelectedUser(item.user.id, 'edit')}
                                            >
                                                可编辑
                                            </Button>
                                            <Button
                                                size="small"
                                                type={item.permission === 'read' ? 'primary' : 'default'}
                                                onClick={() => setPermissionForSelectedUser(item.user.id, 'read')}
                                            >
                                                只读
                                            </Button>
                                        </Space>
                                    </div>
                                </List.Item>
                            )}
                        />

                        {/*<div style={{ marginTop: 12, textAlign: 'right' }}>*/}
                        {/*  <Button onClick={() => { setSelectedUsersInModal([]) }} style={{ marginRight: 8 }}>*/}
                        {/*    清空*/}
                        {/*  </Button>*/}
                        {/*  <Button type="primary" onClick={handleAddUsersSubmit}>*/}
                        {/*    添加（{selectedUsersInModal.length}）*/}
                        {/*  </Button>*/}
                        {/*</div>*/}
                    </div>
                </div>
            </Modal>

            {/* Rename Modal */}
            <Modal
                title="重命名文档"
                open={renameModalVisible}
                onCancel={closeRenameModal}
                onOk={handleRenameSubmit}
                okText="保存"
                cancelText="取消"
            >
                <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    placeholder="输入新的文档名称"
                    maxLength={100}
                />
            </Modal>
        </Layout>
    )
}

export default MyDocsPage
