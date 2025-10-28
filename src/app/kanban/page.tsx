'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from '@/components/ui/kanban';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AppLayout } from '@/components/layout/app-layout';
import { AnimatedTooltip } from '@/components/ui/animated-tooltip';
import type { DragEndEvent } from '@dnd-kit/core';
import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { Search, ChevronDown, ChevronUp, Bug, Code, Lightbulb } from 'lucide-react';
import { TagSelector } from '@/components/ui/tag-selector';
import { userApi } from '@/lib/api';
import { Task, User } from '@/types/issue';

// 任务状态配置
const taskStatuses = [
  { id: "TODO", name: "待办", color: "#6B7280" },
  { id: "IN_PROGRESS", name: "进行中", color: "#F59E0B" },
  { id: "IN_REVIEW", name: "审核中", color: "#8B5CF6" },
  { id: "DONE", name: "完成", color: "#10B981" },
];

// 任务类型配置
const taskTypeConfig = {
  issue: { icon: Bug, label: '产品建议', color: 'bg-orange-100 text-orange-800' },
  feature: { icon: Code, label: '功能开发', color: 'bg-blue-100 text-blue-800' },
  bug: { icon: Bug, label: 'Bug修复', color: 'bg-red-100 text-red-800' },
  improvement: { icon: Lightbulb, label: '优化改进', color: 'bg-green-100 text-green-800' },
};

// 优先级标签
const priorityLabels = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  URGENT: '紧急',
};

// 模拟版本数据
const versions = [
  { id: "1", name: "v1.0.0", description: "初始版本" },
  { id: "2", name: "v1.1.0", description: "功能增强" },
  { id: "3", name: "v2.0.0", description: "重大更新" },
  { id: "4", name: "v2.1.0", description: "性能优化" },
];

const KanbanPage: FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMembers, setExpandedMembers] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'team' | 'personal'>('team');
  const [selectedVersions, setSelectedVersions] = useState<typeof versions>([]);
  
  // 新任务表单状态
  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    type: 'feature' as keyof typeof taskTypeConfig,
    priority: 'MEDIUM' as Task['priority'],
  });

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // 加载用户数据
        const usersResponse = await userApi.getUsers();
        setUsers(usersResponse.users.users);
        
        // 模拟一些任务数据用于测试，但使用真实用户ID
        const mockTasks: Task[] = [
          {
            id: 'task-1',
            title: '设计数据库表结构',
            description: '设计用户管理和项目管理相关的数据库表结构',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            estimatedHours: 16,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            assigneeId: usersResponse.users.users[0]?.id
          },
          {
            id: 'task-2',
            title: '开发用户认证模块',
            description: '实现用户登录、注册和权限验证功能',
            status: 'TODO',
            priority: 'MEDIUM',
            estimatedHours: 24,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            assigneeId: usersResponse.users.users[1]?.id
          },
          {
            id: 'task-3',
            title: '前端界面开发',
            description: '开发用户管理和项目管理的前端界面',
            status: 'DONE',
            priority: 'HIGH',
            estimatedHours: 32,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            assigneeId: usersResponse.users.users[2]?.id
          },
          {
            id: 'task-4',
            title: 'API接口开发',
            description: '开发后端API接口和数据处理逻辑',
            status: 'IN_REVIEW',
            priority: 'HIGH',
            estimatedHours: 20,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            assigneeId: usersResponse.users.users[0]?.id
          },
          {
            id: 'task-5',
            title: '移动端适配',
            description: '优化移动端用户体验和响应式设计',
            status: 'TODO',
            priority: 'MEDIUM',
            estimatedHours: 16,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            assigneeId: usersResponse.users.users[3]?.id
          }
        ];
        
        setTasks(mockTasks);
        
        // 默认展开所有用户
        const expandedState = usersResponse.users.users.reduce((acc: Record<string, boolean>, user: User) => {
          acc[user.id] = true;
          return acc;
        }, {} as Record<string, boolean>);
        setExpandedMembers(expandedState);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      return;
    }

    const status = taskStatuses.find((status) => status.name === over.id);

    if (!status) {
      return;
    }

    setTasks(
      tasks.map((task) => {
        if (task.id === active.id) {
          return { ...task, status: status.id as Task['status'] };
        }

        return task;
      })
    );
  };

  const toggleMemberExpanded = (userId: string) => {
    setExpandedMembers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const getTasksByMember = (userId: string) => {
    return getFilteredTasks().filter(task => task.assigneeId === userId);
  };

  // 筛选功能
  const getFilteredTasks = () => {
    let filtered = tasks;

    // 搜索筛选
    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  // 创建新任务
  const handleCreateTask = () => {
    const task: Task = {
      id: `task-${Date.now()}`,
      title: newTask.name,
      description: newTask.description,
      status: 'TODO',
      priority: newTask.priority,
      estimatedHours: 8,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assigneeId: users[0]?.id, // 默认分配给第一个用户
    };
    
    setTasks([...tasks, task]);
    setNewTask({
      name: '',
      description: '',
      type: 'feature',
      priority: 'MEDIUM',
    });
    setIsCreateDialogOpen(false);
  };

  // 转换用户数据为AnimatedTooltip格式
  // 按任务数量排序，取前8个
  const userTaskCounts = users.map(user => ({
    user,
    taskCount: tasks.filter(task => task.assigneeId === user.id).length,
  }));
  
  const topUsers = userTaskCounts
    .sort((a, b) => b.taskCount - a.taskCount)
    .slice(0, 8) // 最多显示8个
    .map(({ user }) => user);
  
  const teamMembers = topUsers.map((user, index) => ({
    id: index + 1, // AnimatedTooltip需要number类型的id
    name: user.name,
    designation: '成员', // 简化为固定值，因为User类型没有roles字段
    image: `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${user.username}`,
  }));

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 mb-4">加载失败: {error}</p>
            <Button onClick={() => window.location.reload()}>重试</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* 顶部操作栏 */}
        <div className="flex items-center gap-4 h-10">
          {/* 搜索框 */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="搜索任务..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
          </div>

          {/* 团队成员头像 */}
          <AnimatedTooltip items={teamMembers} />

          {/* 右侧空间填充 */}
          <div className="flex-1"></div>

          {/* 版本筛选 */}
          <div className="relative">
            <TagSelector
              availableTags={versions}
              selectedTags={selectedVersions}
              onChange={setSelectedVersions}
              getValue={(version) => version.id}
              getLabel={(version) => version.name}
              createTag={(inputValue: string) => ({ id: `v_${Date.now()}`, name: inputValue, description: '' })}
              className="w-48 h-10 min-h-10 mt-0"
            />
            {selectedVersions.length === 0 && (
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm pointer-events-none z-10">
                选择版本
              </div>
            )}
          </div>

          {/* 视图切换开关 - 移到最右侧 */}
          <div className="flex bg-background border border-border rounded-md p-1 h-10 items-center">
            <button
              onClick={() => setViewMode('team')}
              className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors flex items-center justify-center h-8 ${
                viewMode === 'team' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              团队视图
            </button>
            <button
              onClick={() => setViewMode('personal')}
              className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors flex items-center justify-center h-8 ${
                viewMode === 'personal' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              个人视图
            </button>
          </div>
        </div>

        {/* 创建任务对话框 */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[425px] z-50">
            <DialogHeader>
              <DialogTitle>创建新任务</DialogTitle>
              <DialogDescription>
                添加新的任务到看板中
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">任务名称</label>
                <Input
                  placeholder="输入任务名称"
                  value={newTask.name}
                  onChange={(e) => setNewTask({...newTask, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">任务描述</label>
                <Textarea
                  placeholder="输入任务描述"
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">任务类型</label>
                  <Select 
                    value={newTask.type} 
                    onValueChange={(value) => setNewTask({...newTask, type: value as keyof typeof taskTypeConfig})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[60]">
                      <SelectItem value="feature">功能开发</SelectItem>
                      <SelectItem value="bug">Bug修复</SelectItem>
                      <SelectItem value="improvement">优化改进</SelectItem>
                      <SelectItem value="issue">产品建议</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">优先级</label>
                  <Select 
                    value={newTask.priority} 
                    onValueChange={(value) => setNewTask({...newTask, priority: value as Task['priority']})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[60]">
                      <SelectItem value="LOW">低</SelectItem>
                      <SelectItem value="MEDIUM">中</SelectItem>
                      <SelectItem value="HIGH">高</SelectItem>
                      <SelectItem value="URGENT">紧急</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={handleCreateTask}
                disabled={!newTask.name}
              >
                创建任务
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 根据视图模式显示不同内容 */}
        {viewMode === 'team' ? (
          /* 团队视图 - 多人看板 */
          <div className="space-y-8">
            {users.map((user) => {
              const userTasks = getTasksByMember(user.id);
              return (
                <div key={user.id} className="space-y-4">
                  {/* 成员按钮 */}
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMemberExpanded(user.id)}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={`https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${user.username}`} />
                        <AvatarFallback>{user.name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                      <span className="text-muted-foreground">(成员)</span>
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {userTasks.length}
                      </span>
                      {expandedMembers[user.id] ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
      
                  {/* 看板区域 */}
                  {expandedMembers[user.id] && (
                    <KanbanProvider onDragEnd={handleDragEnd}>
                      {taskStatuses.map((status) => (
                        <KanbanBoard key={status.name} id={status.name}>
                          <KanbanHeader name={status.name} color={status.color} />
                          <KanbanCards>
                          {userTasks
                            .filter((task) => task.status === status.id)
                            .map((task, index) => (
                              <KanbanCard
                                key={task.id}
                                id={task.id}
                                name={task.title}
                                parent={status.name}
                                index={index}
                              >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex flex-col gap-2 flex-1">
                                    <h3 className="font-medium text-sm">{task.title}</h3>
                                    {task.description && (
                                      <p className="text-xs text-muted-foreground">{task.description}</p>
                                    )}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge variant="outline" className="text-xs">
                                        {taskTypeConfig.feature.label}
                                      </Badge>
                                      <Badge className={`text-xs ${
                                        task.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                                        task.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                        task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {priorityLabels[task.priority]}
                                      </Badge>
                                    </div>

                                  </div>
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${user.username}`} />
                                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                                  </Avatar>
                                </div>
                              </KanbanCard>
                            ))}
                        </KanbanCards>
                      </KanbanBoard>
                      ))}
                    </KanbanProvider>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* 个人视图 - 原有的统一看板 */
          <KanbanProvider onDragEnd={handleDragEnd}>
            {taskStatuses.map((status) => (
              <KanbanBoard key={status.name} id={status.name}>
                <KanbanHeader name={status.name} color={status.color} />
                <KanbanCards>
                  {getFilteredTasks()
                    .filter((task) => task.status === status.id)
                    .map((task, index) => {
                      const assignee = users.find(u => u.id === task.assigneeId);
                      return (
                        <KanbanCard
                          key={task.id}
                          id={task.id}
                          name={task.title}
                          parent={status.name}
                          index={index}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex flex-col gap-2 flex-1">
                              <p className="m-0 font-medium text-sm">
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="m-0 text-xs text-muted-foreground line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {taskTypeConfig.feature.label}
                                </Badge>
                                <Badge className={`text-xs ${
                                  task.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                                  task.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                  task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {priorityLabels[task.priority]}
                                </Badge>
                              </div>

                            </div>
                            {assignee && (
                              <Avatar className="h-6 w-6 shrink-0">
                                <AvatarImage src={`https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${assignee.username}`} />
                                <AvatarFallback className="text-xs">
                                  {assignee.name?.slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        </KanbanCard>
                      );
                    })}
                </KanbanCards>
              </KanbanBoard>
            ))}
          </KanbanProvider>
        )}
      </div>
    </AppLayout>
  );
};

export default KanbanPage;