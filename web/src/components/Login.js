import React, {Component} from 'react';
import {Button, Card, Checkbox, Form, Input} from "antd";
import './Login.css'
import request from "../common/request";
import {message} from "antd/es";
import {withRouter} from "react-router-dom";
import {
    UserOutlined, LockOutlined
} from '@ant-design/icons';

class LoginForm extends Component {

    state = {
        inLogin: false
    };

    handleSubmit = async params => {
        this.setState({
            inLogin: true
        });

        try {
            let result = await request.post('/login', params);
            if (result.code !== 1) {
                throw new Error(result.message);
            }

            // 跳转登录
            sessionStorage.removeItem('current');
            sessionStorage.removeItem('openKeys');
            localStorage.setItem('X-Auth-Token', result.data);
            // this.props.history.push();
            window.location.href = "/"

            let r = await request.get('/info');
            if (r.code === 1) {
                this.props.updateUser(r.data);
            } else {
                message.error(r.message);
            }
        } catch (e) {
            message.error(e.message);
        } finally {
            this.setState({
                inLogin: false
            });
        }
    };

    render() {

        return (
                <Card className='login-card' title="登录">
                    <Form onFinish={this.handleSubmit} className="login-form">
                        <Form.Item name='username' rules={[{required: true, message: '请输入登录账号！'}]}>
                            <Input prefix={<UserOutlined/>} placeholder="登录账号"/>
                        </Form.Item>
                        <Form.Item name='password' rules={[{required: true, message: '请输入登录密码！'}]}>
                            <Input.Password prefix={<LockOutlined/>} placeholder="登录密码"/>
                        </Form.Item>
                        <Form.Item name='remember' valuePropName='checked' initialValue={false}>
                            <Checkbox>记住登录</Checkbox>


                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" className="login-form-button"
                                    loading={this.state.inLogin}>
                                登录
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>
        );
    }
}

export default withRouter(LoginForm);