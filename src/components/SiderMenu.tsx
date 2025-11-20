import { Layout, Segmented, Input, Menu } from 'antd'
import type { ItemType } from 'antd/es/menu/interface'
import type React from 'react'

interface SiderMenuProps {
    collapsed: boolean;
    onCollapse: (value: boolean) => void;
    mode: 'user' | 'room';
    setMode: React.Dispatch<React.SetStateAction<"user" | "room">>;
    searchText: string;
    setSearchText: React.Dispatch<React.SetStateAction<string>>;
    filteredItems: ItemType[];
    // 这里默认了room的key是string类型，可能后续需要修改
    setSelectedRoom: React.Dispatch<React.SetStateAction<string | null>>;
}

const SiderMenu: React.FC<SiderMenuProps> = ({
    collapsed, 
    onCollapse, 
    mode, 
    setMode, 
    searchText, 
    setSearchText, 
    filteredItems, 
    setSelectedRoom 
}) => {
    return (
        <Layout.Sider collapsible collapsed={collapsed} onCollapse={onCollapse}>
            <div style={{ padding: 12 }}>
                <Segmented
                    options={[
                        { label: '用户名', value: 'user' },
                        { label: '房间名', value: 'room' },
                    ]}
                    value={mode}
                    onChange={(val) => setMode(val as 'user' | 'room')}
                    block
                />
                <Input
                    placeholder="搜索..."
                    allowClear
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ marginTop: 12 }}
                />
            </div>

            <Menu
                theme="dark"
                mode="inline"
                items={filteredItems}
                onClick={(e) => setSelectedRoom(e.key)}
            />
        </Layout.Sider>
    )
}

export default SiderMenu
