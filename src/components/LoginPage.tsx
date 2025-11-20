import React, { useState } from 'react';
import { Form, Input, Button, Typography, message, Card } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import RegisterModal from './RegisterModal'; // 引用注册弹窗

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [registerVisible, setRegisterVisible] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // 登录逻辑
  const handleLogin = async (values: any) => {
    setLoading(true);
    try {
      const { email, password } = values;
      const res = await axios.post('/api/login', { email, password });

      if (res.status === 200) {
        message.success('登录成功');
        navigate('/home'); // 登录成功跳转主页
      }
    } catch (err) {
      console.error(err);
      message.error('登录失败，请检查邮箱和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f0f2f5',
      }}
    >
      <Card
        style={{
          width: 400,
          padding: 24,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          borderRadius: 12,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3}>欢迎登录</Title>
          <Text type="secondary">请输入您的邮箱和密码</Text>
        </div>

        <Form
          form={form}
          name="login_form"
          layout="vertical"
          onFinish={handleLogin}
        >
          {/* 邮箱 */}
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱！' },
              { type: 'email', message: '邮箱格式不正确！' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="请输入邮箱"
              size="large"
            />
          </Form.Item>

          {/* 密码 */}
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码！' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
              size="large"
            />
          </Form.Item>

          {/* 登录按钮 */}
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
            >
              登录
            </Button>
          </Form.Item>

          {/* 辅助链接 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 14,
            }}
          >
            <Button
              type="link"
              style={{ padding: 0 }}
              onClick={() => message.info('忘记密码功能开发中')}
            >
              忘记密码？
            </Button>
            <Button
              type="link"
              style={{ padding: 0 }}
              onClick={() => setRegisterVisible(true)}
            >
              立即注册
            </Button>
          </div>
        </Form>
      </Card>

      {/* 注册弹窗 */}
      <RegisterModal
        open={registerVisible}
        onClose={() => setRegisterVisible(false)}
      />
    </div>
  );
};

export default LoginPage;
