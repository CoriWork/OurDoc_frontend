import React, { useState } from 'react';
import { Breadcrumb, Button, Form, Input, Layout, message } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';

interface ContentWithEditorAndPreviewProps {
    editorText: string;
    setEditor: React.Dispatch<any>;
    // 这里默认了room的key是string类型，可能后续需要修改
    selectedRoom: string | null;
    showPreview: boolean;
    setShowPreview: React.Dispatch<React.SetStateAction<boolean>>;
    peers: number;
}

// 定义表单字段类型
type CreateDocFormValues = {
    docname: string;
};

export const CreateNewDocForm: React.FC = () => {
    const [form] = Form.useForm<CreateDocFormValues>();
    const [loading, setLoading] = useState(false);

    const createNewDoc = async (values: CreateDocFormValues) => {
        setLoading(true);
        try {
            // 调用api创建文档
            await new Promise(resolve => setTimeout(resolve, 1000));
            message.success(`文档 "${values.docname}" 创建成功！`);
            // 成功后重置表单
            form.resetFields();
        } catch (error) {
            console.error('Form submission error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout.Content
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 'calc(100vh - 64px - 70px)',
                padding: '24px',
                background: '#f5f5f5',
            }}
        >
            <div
                style={{
                    background: 'white',
                    padding: '40px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    width: '100%',
                    maxWidth: '500px',
                }}
            >
                <h2 style={{ textAlign: 'center', marginBottom: '32px', color: '#1890ff' }}>
                    创建新文档
                </h2>

                <Form<CreateDocFormValues>
                    form={form}
                    name="createDoc"
                    labelCol={{ span: 6 }}
                    wrapperCol={{ span: 18 }}
                    style={{ maxWidth: 600 }}
                    onFinish={createNewDoc}
                    autoComplete="off"
                    size="large"
                >
                    <Form.Item<CreateDocFormValues>
                        label="文档名称"
                        name="docname"
                        rules={[
                            { required: true, message: '请输入文档名称！' },
                            { min: 2, message: '文档名称至少2个字符！' },
                            { max: 50, message: '文档名称不能超过50个字符！' },
                            {
                                pattern: /^[a-zA-Z0-9\u4e00-\u9fa5_\-\s]+$/,
                                message: '文档名称只能包含中文、英文、数字、下划线和减号！',
                            },
                        ]}
                    >
                        <Input
                            placeholder="请输入文档名称"
                            allowClear
                        />
                    </Form.Item>

                    <Form.Item wrapperCol={{ offset: 6, span: 18 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            loading={loading}
                            size="large"
                        >
                            {loading ? '创建中...' : '创建文档'}
                        </Button>
                    </Form.Item>
                </Form>
            </div>
        </Layout.Content>
    );
};

export const ContentWithEditorAndPreview: React.FC<ContentWithEditorAndPreviewProps> = ({
    editorText,
    setEditor,
    selectedRoom,
    showPreview,
    setShowPreview,
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
