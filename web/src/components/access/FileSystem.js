import React, {Component} from 'react';
import {Button, Card, Col, Form, Input, message, Modal, Row, Space, Table, Tooltip} from "antd";
import {
    CloudDownloadOutlined,
    CloudUploadOutlined,
    DeleteOutlined,
    EditOutlined,
    ExclamationCircleOutlined,
    FileExcelOutlined,
    FileImageOutlined,
    FileMarkdownOutlined,
    FileOutlined,
    FilePdfOutlined,
    FileTextOutlined,
    FileWordOutlined,
    FileZipOutlined,
    FolderAddOutlined,
    FolderTwoTone,
    ReloadOutlined,
    ThunderboltTwoTone,
    UploadOutlined
} from "@ant-design/icons";
import qs from "qs";
import request from "../../common/request";
import {server} from "../../common/env";
import Upload from "antd/es/upload";
import {download, getFileName, getToken, isEmpty, renderSize} from "../../utils/utils";
import './FileSystem.css'

const {confirm} = Modal;

class FileSystem extends Component {

    mkdirFormRef = React.createRef();
    renameFormRef = React.createRef();

    state = {
        sessionId: undefined,
        currentDirectory: '/',
        currentDirectoryInput: '/',
        files: [],
        loading: false,
        selectedRowKeys: [],
        selectedRow: {},
        dropdown: {
            visible: false
        },
    }

    componentDidMount() {
        let sessionId = this.props.sessionId;
        this.setState({
            sessionId: sessionId
        }, () => {
            this.loadFiles(this.state.currentDirectory);
        });
    }

    download = () => {
        download(`${server}/sessions/${this.state.sessionId}/download?file=${this.state.selectedRow.key}`);
    }

    rmdir = async () => {
        let selectedRowKeys = this.state.selectedRowKeys;
        if (selectedRowKeys === undefined || selectedRowKeys.length === 0) {
            message.warning('请至少选择一个文件或目录');
        }

        let title;
        if (selectedRowKeys.length === 1) {
            let file = getFileName(selectedRowKeys[0]);
            title = <p>您确认要删除"{file}"吗？</p>;
        } else {
            title = `您确认要删除所选的${selectedRowKeys.length}项目吗？`;
        }
        confirm({
            title: title,
            icon: <ExclamationCircleOutlined/>,
            content: '所选项目将立即被删除。',
            onOk: async () => {
                for (let i = 0; i < selectedRowKeys.length; i++) {
                    let rowKey = selectedRowKeys[i];
                    if (rowKey === '..') {
                        continue;
                    }
                    let result = await request.post(`/sessions/${this.state.sessionId}/rm?key=${rowKey}`);
                    if (result['code'] !== 1) {
                        message.error(result['message']);
                    }
                }
                await this.loadFiles(this.state.currentDirectory);
            },
            onCancel() {

            },
        });
    }

    refresh = async () => {
        this.loadFiles(this.state.currentDirectory);
    }

    loadFiles = async (key) => {
        this.setState({
            loading: true
        })
        try {
            if (isEmpty(key)) {
                key = '/';
            }
            let result = await request.get(`/sessions/${this.state.sessionId}/ls?dir=${key}`);
            if (result['code'] !== 1) {
                message.error(result['message']);
                return;
            }

            let data = result['data'];

            const items = data.map(item => {
                return {'key': item['path'], ...item}
            });

            if (key !== '/') {
                items.splice(0, 0, {key: '..', name: '..', path: '..', isDir: true})
            }

            this.setState({
                files: items,
                currentDirectory: key,
                currentDirectoryInput: key,
                selectedRow: {},
                selectedRowKeys: []
            })
        } finally {
            this.setState({
                loading: false
            })
        }

    }

    uploadChange = (info) => {
        if (info.file.status !== 'uploading') {

        }
        if (info.file.status === 'done') {
            message.success(`${info.file.name} 文件上传成功。`, 3);
        } else if (info.file.status === 'error') {
            message.error(`${info.file.name} 文件上传失败。`, 10);
        }
    }

    getNodeTreeRightClickMenu = () => {
        const {pageX, pageY, visible} = {...this.state.dropdown};
        if (visible) {
            const tmpStyle = {
                left: `${pageX}px`,
                top: `${pageY}px`,
            };

            let disableDownload = true;
            if (this.state.selectedRowKeys.length === 1
                && !this.state.selectedRow['isDir']
                && !this.state.selectedRow['isLink']) {
                disableDownload = false;
            }

            let disableRename = true;
            if (this.state.selectedRowKeys.length === 1) {
                disableRename = false;
            }

            return (
                <ul className="popup" style={tmpStyle}>
                    <li><Button type={'text'} size={'small'} icon={<CloudDownloadOutlined/>} onClick={this.download}
                                disabled={disableDownload}>下载</Button></li>

                    <li><Button type={'text'} size={'small'} icon={<EditOutlined/>} disabled={disableRename}
                                onClick={() => {
                                    this.setState({
                                        renameVisible: true
                                    })
                                }}
                    >重命名</Button></li>

                    <li><Button type={'text'} size={'small'} icon={<DeleteOutlined/>} onClick={this.rmdir}>删除</Button>
                    </li>
                </ul>
            );
        }
        return undefined;
    };

    handleCurrentDirectoryInputChange = (event) => {
        this.setState({
            currentDirectoryInput: event.target.value
        })
    }

    handleCurrentDirectoryInputPressEnter = (event) => {
        this.loadFiles(event.target.value);
    }

    render() {

        const columns = [
            {
                title: '名称',
                dataIndex: 'name',
                key: 'name',
                render: (value, item) => {
                    let icon;
                    if (item['isDir']) {
                        icon = <FolderTwoTone/>;
                    } else {
                        if (item['isLink']) {
                            icon = <ThunderboltTwoTone/>;
                        } else {
                            const fileExtension = item['name'].split('.').pop().toLowerCase();
                            switch (fileExtension) {
                                case "doc":
                                case "docx":
                                    icon = <FileWordOutlined/>;
                                    break;
                                case "xls":
                                case "xlsx":
                                    icon = <FileExcelOutlined/>;
                                    break;
                                case "bmp":
                                case "jpg":
                                case "jpeg":
                                case "png":
                                case "tif":
                                case "gif":
                                case "pcx":
                                case "tga":
                                case "exif":
                                case "svg":
                                case "psd":
                                case "ai":
                                case "webp":
                                    icon = <FileImageOutlined/>;
                                    break;
                                case "md":
                                    icon = <FileMarkdownOutlined/>;
                                    break;
                                case "pdf":
                                    icon = <FilePdfOutlined/>;
                                    break;
                                case "txt":
                                    icon = <FileTextOutlined/>;
                                    break;
                                case "zip":
                                case "gz":
                                case "tar":
                                case "tgz":
                                    icon = <FileZipOutlined/>;
                                    break;
                                default:
                                    icon = <FileOutlined/>;
                                    break;
                            }
                        }
                    }

                    return <span className={'dode'}>{icon}&nbsp;&nbsp;{item['name']}</span>;
                },
                sorter: (a, b) => {
                    if (a['key'] === '..') {
                        return 0;
                    }

                    if (b['key'] === '..') {
                        return 0;
                    }
                    return a.name.localeCompare(b.name);
                },
                sortDirections: ['descend', 'ascend'],
            },
            {
                title: '大小',
                dataIndex: 'size',
                key: 'size',
                render: (value, item) => {
                    if (!item['isDir'] && !item['isLink']) {
                        return <span className={'dode'}>{renderSize(value)}</span>;
                    }
                    return <span className={'dode'}/>;
                },
                sorter: (a, b) => {
                    if (a['key'] === '..') {
                        return 0;
                    }

                    if (b['key'] === '..') {
                        return 0;
                    }
                    return a.size - b.size;
                },
            }, {
                title: '修改日期',
                dataIndex: 'modTime',
                key: 'modTime',
                sorter: (a, b) => {
                    if (a['key'] === '..') {
                        return 0;
                    }

                    if (b['key'] === '..') {
                        return 0;
                    }
                    return a.modTime.localeCompare(b.modTime);
                },
                sortDirections: ['descend', 'ascend'],
                render: (value, item) => {
                    return <span className={'dode'}>{value}</span>;
                },
            }, {
                title: '属性',
                dataIndex: 'mode',
                key: 'mode',
                render: (value, item) => {
                    return <span className={'dode'}>{value}</span>;
                },
            }
        ];

        const title = (
            <Row justify="space-around" align="middle" gutter={24}>
                <Col span={20} key={1}>
                    <Input value={this.state.currentDirectoryInput} onChange={this.handleCurrentDirectoryInputChange}
                           onPressEnter={this.handleCurrentDirectoryInputPressEnter}/>
                </Col>
                <Col span={4} key={2} style={{textAlign: 'right'}}>
                    <Space>
                        <Tooltip title="创建文件夹">
                            <Button type="primary" size="small" icon={<FolderAddOutlined/>}
                                    onClick={() => {
                                        this.setState({
                                            mkdirVisible: true
                                        })
                                    }} ghost/>
                        </Tooltip>

                        <Tooltip title="上传">
                            <Button type="primary" size="small" icon={<CloudUploadOutlined/>}
                                    onClick={() => {
                                        this.setState({
                                            uploadVisible: true
                                        })
                                    }} ghost/>
                        </Tooltip>

                        <Tooltip title="刷新">
                            <Button type="primary" size="small" icon={<ReloadOutlined/>} onClick={this.refresh}
                                    ghost/>
                        </Tooltip>
                    </Space>
                </Col>
            </Row>
        );

        const {selectedRowKeys} = this.state;
        const rowSelection = {
            selectedRowKeys,
            onChange: (selectedRowKeys) => {
                selectedRowKeys = selectedRowKeys.filter(rowKey => rowKey !== '..');
                this.setState({selectedRowKeys});
            },
        };

        return (
            <div>
                <Card title={title} bordered={true} size="small">

                    <Table columns={columns}
                           rowSelection={rowSelection}
                           dataSource={this.state.files}
                           size={'small'}
                           pagination={false}
                           loading={this.state.loading}

                           onRow={record => {
                               return {
                                   onClick: event => {
                                       if (record['key'] === '..') {
                                           return;
                                       }
                                       this.setState({
                                           selectedRow: record,
                                           selectedRowKeys: [record['key']]
                                       });
                                   }, // 点击行
                                   onDoubleClick: event => {
                                       if (record['isDir'] || record['isLink']) {
                                           if (record['path'] === '..') {
                                               // 获取当前目录的上级目录
                                               let currentDirectory = this.state.currentDirectory;
                                               let parentDirectory = currentDirectory.substring(0, currentDirectory.lastIndexOf('/'));
                                               this.loadFiles(parentDirectory);
                                           } else {
                                               this.loadFiles(record['path']);
                                           }
                                       } else {

                                       }
                                   },
                                   onContextMenu: event => {
                                       event.preventDefault();
                                       if (record['key'] === '..') {
                                           return;
                                       }

                                       let selectedRowKeys = this.state.selectedRowKeys;
                                       if (selectedRowKeys.length === 0) {
                                           selectedRowKeys = [record['key']]
                                       }
                                       this.setState({
                                           selectedRow: record,
                                           selectedRowKeys: selectedRowKeys,
                                           dropdown: {
                                               visible: true,
                                               pageX: event.pageX,
                                               pageY: event.pageY,
                                           }
                                       });

                                       if (!this.state.dropdown.visible) {
                                           const that = this;
                                           document.addEventListener(`click`, function onClickOutside() {
                                               that.setState({dropdown: {visible: false}});
                                               document.removeEventListener(`click`, onClickOutside);

                                               document.querySelector('.ant-drawer-body').style.height = 'unset';
                                               document.querySelector('.ant-drawer-body').style['overflow-y'] = 'auto';
                                           });

                                           document.querySelector('.ant-drawer-body').style.height = '100vh';
                                           document.querySelector('.ant-drawer-body').style['overflow-y'] = 'hidden';
                                       }
                                   },
                                   onMouseEnter: event => {

                                   }, // 鼠标移入行
                                   onMouseLeave: event => {

                                   },
                               };
                           }}

                           rowClassName={(record) => {
                               return record['key'] === this.state.selectedRow['key'] ? 'selectedRow' : '';
                           }}
                    />
                </Card>

                <Modal
                    title="上传文件"
                    visible={this.state.uploadVisible}

                    onOk={() => {
                        this.setState({
                            uploadVisible: false
                        })
                        this.loadFiles(this.state.currentDirectory);
                    }}
                    confirmLoading={this.state.uploadLoading}
                    onCancel={() => {
                        this.setState({
                            uploadVisible: false
                        })
                    }}
                >
                    <Upload
                        action={server + '/sessions/' + this.state.sessionId + '/upload?X-Auth-Token=' + getToken() + '&dir=' + this.state.currentDirectory}>
                        <Button icon={<UploadOutlined/>}>上传文件</Button>
                    </Upload>
                </Modal>


                {
                    this.state.mkdirVisible ?
                        <Modal
                            title="创建文件夹"
                            visible={this.state.mkdirVisible}

                            onOk={() => {
                                this.mkdirFormRef.current
                                    .validateFields()
                                    .then(async values => {
                                        this.mkdirFormRef.current.resetFields();
                                        let params = {
                                            'dir': this.state.currentDirectory + '/' + values['dir']
                                        }
                                        let paramStr = qs.stringify(params);

                                        this.setState({
                                            confirmLoading: true
                                        })
                                        let result = await request.post(`/sessions/${this.state.sessionId}/mkdir?${paramStr}`);
                                        if (result.code === 1) {
                                            message.success('创建成功');
                                            this.loadFiles(this.state.currentDirectory);
                                        } else {
                                            message.error(result.message);
                                        }

                                        this.setState({
                                            confirmLoading: false,
                                            mkdirVisible: false
                                        })
                                    })
                                    .catch(info => {

                                    });
                            }}
                            confirmLoading={this.state.confirmLoading}
                            onCancel={() => {
                                this.setState({
                                    mkdirVisible: false
                                })
                            }}
                        >
                            <Form ref={this.mkdirFormRef}>

                                <Form.Item name='dir' rules={[{required: true, message: '请输入文件夹名称'}]}>
                                    <Input autoComplete="off" placeholder="请输入文件夹名称"/>
                                </Form.Item>
                            </Form>
                        </Modal> : undefined
                }

                {
                    this.state.renameVisible ?
                        <Modal
                            title="重命名"
                            visible={this.state.renameVisible}

                            onOk={() => {
                                this.renameFormRef.current
                                    .validateFields()
                                    .then(async values => {
                                        this.renameFormRef.current.resetFields();

                                        try {
                                            let currentDirectory = this.state.currentDirectory;
                                            if (!currentDirectory.endsWith("/")) {
                                                currentDirectory += '/';
                                            }
                                            let params = {
                                                'oldName': this.state.selectedRowKeys[0],
                                                'newName': currentDirectory + values['newName'],
                                            }

                                            if (params['oldName'] === params['newName']) {
                                                message.success('重命名成功');
                                                return;
                                            }

                                            let paramStr = qs.stringify(params);

                                            this.setState({
                                                confirmLoading: true
                                            })
                                            let result = await request.post(`/sessions/${this.state.sessionId}/rename?${paramStr}`);
                                            if (result['code'] === 1) {
                                                message.success('重命名成功');
                                                let files = this.state.files;
                                                for (let i = 0; i < files.length; i++) {
                                                    if (files['key'] === params['oldName']) {
                                                        files[i].path = params['newName'];
                                                        files[i].key = params['newName'];
                                                        files[i].name = getFileName(params['newName']);
                                                        break;
                                                    }
                                                }
                                                this.setState({
                                                    files: files
                                                })
                                            } else {
                                                message.error(result.message);
                                            }
                                        } finally {
                                            this.setState({
                                                confirmLoading: false,
                                                renameVisible: false
                                            })
                                        }
                                    })
                                    .catch(info => {

                                    });
                            }}
                            confirmLoading={this.state.confirmLoading}
                            onCancel={() => {
                                this.setState({
                                    renameVisible: false
                                })
                            }}
                        >
                            <Form ref={this.renameFormRef}
                                  initialValues={{newName: getFileName(this.state.selectedRowKeys[0])}}>
                                <Form.Item name='newName' rules={[{required: true, message: '请输入新的名称'}]}>
                                    <Input autoComplete="off" placeholder="新的名称"/>
                                </Form.Item>
                            </Form>
                        </Modal> : undefined
                }


                {this.getNodeTreeRightClickMenu()}
            </div>
        );
    }
}

export default FileSystem;