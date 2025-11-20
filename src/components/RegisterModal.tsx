import React, { useState } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd/es/form';
import axios from 'axios';

interface RegisterModalProps {
  open: boolean;
  onClose: () => void;
}

const RegisterModal: React.FC<RegisterModalProps> = ({ open, onClose }) => {
  const [form] = Form.useForm<FormInstance>();
  const [loading, setLoading] = useState(false);

  // 表单提交逻辑
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 模拟发送注册请求
      await axios.post('/api/register', {
        email: values.email,
        password: values.password,
      });

      message.success('注册成功');
      form.resetFields();
      onClose();
    } catch (err) {
      console.error(err);
      message.error('注册失败，请检查输入');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title="注册账号"
      onCancel={onClose}
      footer={null}
      centered
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        name="register_form"
        onFinish={handleSubmit}
      >
        {/* 邮箱输入框 */}
        <Form.Item
          name="email"
          label="邮箱"
          rules={[
            { required: true, message: '请输入邮箱地址！' },
            { type: 'email', message: '邮箱格式不正确！' },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="请输入邮箱" />
        </Form.Item>

        {/* 密码输入框 */}
        <Form.Item
          name="password"
          label="密码"
          rules={[
            { required: true, message: '请输入密码！' },
            { min: 6, message: '密码至少为 6 位字符！' },
          ]}
          hasFeedback
        >
          <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" />
        </Form.Item>

        {/* 确认密码输入框 */}
        <Form.Item
          name="confirmPassword"
          label="确认密码"
          dependencies={['password']} // 依赖password字段
          hasFeedback
          rules={[
            { required: true, message: '请再次输入密码！' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致！'));
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="请再次输入密码" />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            style={{ marginTop: 12 }}
          >
            注册
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default RegisterModal;
