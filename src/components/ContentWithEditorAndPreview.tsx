import React from 'react';
import {Button, Form, Input, Layout, message} from 'antd';
import Editor, {type OnMount} from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';

interface ContentWithEditorAndPreviewProps {
    editorText: string;
    showPreview: boolean;
    handleEditorMount: OnMount;
    hasAccess?: boolean;
    editingEnabled: boolean;
}

// type CreateDocFormValues = {
//     docname: string;
// };
//
// export const CreateNewDocForm: React.FC = () => {
//     const [form] = Form.useForm<CreateDocFormValues>();
//     const [loading, setLoading] = React.useState(false);
//
//     const createNewDoc = async (values: CreateDocFormValues) => {
//         setLoading(true);
//         try {
//             await new Promise(resolve => setTimeout(resolve, 1000));
//             message.success(`文档 "${values.docname}" 创建成功！`);
//             form.resetFields();
//         } catch (error) {
//             console.error('Form submission error:', error);
//         } finally {
//             setLoading(false);
//         }
//     };
//
//     return (
//         <Layout.Content
//             style={{
//                 display: 'flex',
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 minHeight: 'calc(100vh - 64px - 70px)',
//                 padding: '24px',
//                 background: '#f5f5f5',
//             }}
//         >
//             <div
//                 style={{
//                     background: 'white',
//                     padding: '40px',
//                     borderRadius: '8px',
//                     boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
//                     width: '100%',
//                     maxWidth: '500px',
//                 }}
//             >
//                 <h2 style={{textAlign: 'center', marginBottom: '32px', color: '#1890ff'}}>
//                     创建新文档
//                 </h2>
//
//                 <Form<CreateDocFormValues>
//                     form={form}
//                     name="createDoc"
//                     labelCol={{span: 6}}
//                     wrapperCol={{span: 18}}
//                     style={{maxWidth: 600}}
//                     onFinish={createNewDoc}
//                     autoComplete="off"
//                     size="large"
//                 >
//                     <Form.Item<CreateDocFormValues>
//                         label="文档名称"
//                         name="docname"
//                         rules={[
//                             {required: true, message: '请输入文档名称！'},
//                             {min: 2, message: '文档名称至少2个字符！'},
//                             {max: 50, message: '文档名称不能超过50个字符！'},
//                             {
//                                 pattern: /^[a-zA-Z0-9\u4e00-\u9fa5_\-\s]+$/,
//                                 message: '文档名称只能包含中文、英文、数字、下划线和减号！',
//                             },
//                         ]}
//                     >
//                         <Input placeholder="请输入文档名称" allowClear/>
//                     </Form.Item>
//
//                     <Form.Item wrapperCol={{offset: 6, span: 18}}>
//                         <Button type="primary" htmlType="submit" block loading={loading} size="large">
//                             {loading ? '创建中...' : '创建文档'}
//                         </Button>
//                     </Form.Item>
//                 </Form>
//             </div>
//         </Layout.Content>
//     );
// };

// Main content component
export const ContentWithEditorAndPreview: React.FC<ContentWithEditorAndPreviewProps> = ({
                                                                                            editorText,
                                                                                            showPreview,
                                                                                            handleEditorMount,
                                                                                            hasAccess = true,
                                                                                            editingEnabled,
                                                                                        }) => {
    // No-access overlay
    const NoAccessOverlay = () => (
        <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
            zIndex: 30,
        }}>
            <div style={{
                background: 'rgba(255,255,255,0.9)',
                color: '#222',
                padding: 24,
                borderRadius: 12,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                textAlign: 'center',
                maxWidth: 520,
            }}>
                <h3 style={{marginBottom: 12}}>无权查看文档内容</h3>
                <div style={{marginBottom: 16, color: '#666'}}>
                    你没有查看该文档的权限。
                </div>
                <div>
                    <Button type="primary" onClick={() => window.location.reload()}>刷新重试</Button>
                </div>
            </div>
        </div>
    )

    return (
        <Layout.Content style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            position: 'relative',
        }}>
            {/* 编辑器 + 预览区 */}
            <div
                style={{
                    display: 'flex',
                    gap: showPreview ? '16px' : 0,
                    padding: 24,
                    flex: 1,
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                }}
            >
                <div style={{
                    width: showPreview ? '50%' : '100%',
                    transition: 'width 0.3s ease',
                    minWidth: 0,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '8px',
                }}>
                    <div style={{flex: 1, minHeight: 0}}>
                        <Editor
                            defaultLanguage="markdown"
                            defaultValue={editorText}
                            theme="vs-dark"
                            onMount={handleEditorMount}
                            options={{automaticLayout: true, minimap: {enabled: false}, readOnly: !editingEnabled}}
                        />
                    </div>
                </div>

                <div
                    style={{
                        width: showPreview ? '50%' : 0,
                        opacity: showPreview ? 1 : 0,
                        background: '#1e1e1e',
                        color: '#fff',
                        padding: showPreview ? '16px' : 0,
                        overflowY: 'auto',
                        transition: 'all 0.3s ease',
                        borderRadius: '8px',
                    }}
                >
                    <ReactMarkdown>{editorText}</ReactMarkdown>
                </div>

                {/* Blur overlay when no view access */}
                {!hasAccess && (
                    <>
                        <NoAccessOverlay/>
                    </>
                )}
            </div>
        </Layout.Content>
    );
};
