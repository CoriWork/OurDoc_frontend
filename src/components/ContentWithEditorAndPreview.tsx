import React from 'react';
import { Breadcrumb, Button, Form, Input, Layout } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import type { FormProps } from 'antd';

interface ContentWithEditorAndPreviewProps {
    editorText: string;
    setEditor: React.Dispatch<any>;
    // 这里默认了room的key是string类型，可能后续需要修改
    selectedRoom: string | null;
    showPreview: boolean;
    setShowPreview: React.Dispatch<React.SetStateAction<boolean>>;
    colorBgContainer: string;
    borderRadiusLG: number;
    peers: number;
}

type FieldType = {
    docname?: string;
};

const onFinish: FormProps<FieldType>['onFinish'] = (values) => {
    console.log('Success:', values);
};

const onFinishFailed: FormProps<FieldType>['onFinishFailed'] = (errorInfo) => {
    console.log('Failed:', errorInfo);
};

export const CreateNewDocForm: React.FC = () => {
    return (
        <Layout.Content
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 'calc(100vh - 64px - 70px)',
                padding: '24px',
            }}
        >
            <Form
                name="basic"
                labelCol={{ span: 8 }}
                wrapperCol={{ span: 16 }}
                style={{ maxWidth: 600 }}
                initialValues={{ remember: true }}
                onFinish={onFinish}
                onFinishFailed={onFinishFailed}
                autoComplete="off"
            >
                <Form.Item<FieldType>
                    label="DocName"
                    name="docname"
                    rules={[{ required: true, message: 'Please input your doc name!' }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item label={null}>
                    <Button type="primary" htmlType="submit">
                        Create
                    </Button>
                </Form.Item>
            </Form>
        </Layout.Content>
    )
}

export const ContentWithEditorAndPreview: React.FC<ContentWithEditorAndPreviewProps> = ({
    editorText,
    setEditor,
    selectedRoom,
    showPreview,
    setShowPreview,
    colorBgContainer,
    borderRadiusLG,
    peers
}) => {
    return (
        <Layout.Content>
            {/* 文档展示区 + 操作区 */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Breadcrumb
                    style={{ margin: '0 0' }}
                    // 这里目前使用的是key，后续要换成文档的name
                    items={[{ title: selectedRoom }, { title: `online peers: ${peers}` }]}
                />
                <Button
                    type={showPreview ? 'primary' : 'default'}
                    icon={showPreview ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                    onClick={() => setShowPreview(!showPreview)}
                >
                    {showPreview ? '关闭预览' : '预览'}
                </Button>
            </div>

            {/* 编辑器 + 预览区 */}
            <div
                style={{
                    display: 'flex',
                    gap: showPreview ? '16px' : 0,
                    padding: 24,
                    background: colorBgContainer,
                    // borderRadius: borderRadiusLG,
                    height: '90vh',
                    transition: 'all 0.3s ease',
                }}
            >
                <div
                    style={{
                        width: showPreview ? '50%' : '100%',
                        transition: 'width 0.3s ease',
                    }}
                >
                    <Editor
                        // height="60vh"
                        defaultLanguage="markdown"
                        defaultValue={editorText}
                        theme="vs-dark"
                        onMount={(editor) => setEditor(editor)}
                    />
                </div>

                <div
                    style={{
                        width: showPreview ? '50%' : 0,
                        opacity: showPreview ? 1 : 0,
                        background: '#1e1e1e',
                        color: '#fff',
                        // borderRadius: borderRadiusLG,
                        padding: showPreview ? '16px' : 0,
                        overflowY: 'auto',
                        transition: 'all 0.3s ease',
                    }}
                >
                    <ReactMarkdown>{editorText}</ReactMarkdown>
                </div>
            </div>
        </Layout.Content>

    );
};
