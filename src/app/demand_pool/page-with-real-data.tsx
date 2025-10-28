'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { issueApi, projectApi, userApi } from '@/lib/api';
import { Issue, Project, User, IssueStatus, Priority, InputSource, IssueType } from '@/types/issue';

import {
  Table,
  TableHeader as TableHeaderRaw,
  TableBody as TableBodyRaw,
  TableRow as TableRowRaw,
  TableCell as TableCellRaw,
  TableHead as TableHeadRaw,
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Loader2, RefreshCw } from 'lucide-react';

// 状态标签配置
const statusConfig = {
  [IssueStatus.OPEN]: { label: '新建', color: 'bg-blue-100 text-blue-800' },
  [IssueStatus.IN_DISCUSSION]: { label: '讨论中', color: 'bg-yellow-100 text-yellow-800' },
  [IssueStatus.APPROVED]: { label: '已批准', color: 'bg-green-100 text-green-800' },
  [IssueStatus.IN_PRD]: { label: 'PRD中', color: 'bg-purple-100 text-purple-800' },
  [IssueStatus.IN_DEVELOPMENT]: { label: '开发中', color: 'bg-indigo-100 text-indigo-800' },
  [IssueStatus.IN_TESTING]: { label: '测试中', color: 'bg-orange-100 text-orange-800' },
  [IssueStatus.IN_ACCEPTANCE]: { label: '验收中', color: 'bg-pink-100 text-pink-800' },
  [IssueStatus.COMPLETED]: { label: '已完成', color: 'bg-green-200 text-green-900' },
  [IssueStatus.REJECTED]: { label: '已拒绝', color: 'bg-red-100 text-red-800' },
  [IssueStatus.CANCELLED]: { label: '已取消', color: 'bg-gray-100 text-gray-800' },
};

// 优先级标签配置
const priorityConfig = {
  [Priority.LOW]: { label: '低', color: 'bg-gray-100 text-gray-800' },
  [Priority.MEDIUM]: { label: '中', color: 'bg-yellow-100 text-yellow-800' },
  [Priority.HIGH]: { label: '高', color: 'bg-orange-100 text-orange-800' },
  [Priority.URGENT]: { label: '紧急', color: 'bg-red-100 text-red-800' },
};



// Issue类型配置
const issueTypeConfig = {
  [IssueType.FEATURE]: { label: '新功能', color: 'bg-blue-100 text-blue-800' },
  [IssueType.ENHANCEMENT]: { label: '功能优化', color: 'bg-green-100 text-green-800' },
  [IssueType.BUG_FIX]: { label: '问题修复', color: 'bg-red-100 text-red-800' },
  [IssueType.TECHNICAL_DEBT]: { label: '技术债务', color: 'bg-orange-100 text-orange-800' },
  [IssueType.RESEARCH]: { label: '调研需求', color: 'bg-purple-100 text-purple-800' },
};

export default function IssuesPage() {
  // 状态管理
  const [issues, setIssues] = useState<Issue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // 创建表单状态
  const [newIssue, setNewIssue] = useState({
    title: '',
    description: '',
    priority: Priority.MEDIUM,
    inputSource: InputSource.USER_FEEDBACK,
    issueType: IssueType.FEATURE,
    projectId: '',
    assigneeId: '',
    businessValue: '',
    userImpact: '',
    technicalRisk: '',
  });

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      const [issuesResult, projectsResult, usersResult] = await Promise.all([
        issueApi.getIssues(),
        projectApi.getProjects(),
        userApi.getUsers(),
      ]);

      setIssues(issuesResult.issues?.issues || []);
      setProjects(projectsResult.projects?.projects || []);
      setUsers(usersResult.users?.users || []);
    } catch (error) {
      console.error('加载数据失败:', error);
      // 这里可以添加错误提示
    } finally {
      setLoading(false);
    }
  };

  // 创建Issue
  const handleCreateIssue = async () => {
    if (!newIssue.title || !newIssue.projectId) return;

    try {
      setCreating(true);
      await issueApi.createIssue({
        title: newIssue.title,
        description: newIssue.description,
        priority: newIssue.priority,
        inputSource: newIssue.inputSource,
        issueType: newIssue.issueType,
        projectId: newIssue.projectId,
        assigneeId: newIssue.assigneeId || undefined,
        businessValue: newIssue.businessValue || undefined,
        userImpact: newIssue.userImpact || undefined,
        technicalRisk: newIssue.technicalRisk || undefined,
      });

      // 重新加载数据
      await loadData();
      
      // 重置表单
      setNewIssue({
        title: '',
        description: '',
        priority: Priority.MEDIUM,
        inputSource: InputSource.USER_FEEDBACK,
        issueType: IssueType.FEATURE,
        projectId: '',
        assigneeId: '',
        businessValue: '',
        userImpact: '',
        technicalRisk: '',
      });
      
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('创建Issue失败:', error);
      // 这里可以添加错误提示
    } finally {
      setCreating(false);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadData();
  }, []);

  // 过滤Issues
  const filteredIssues = issues.filter(issue =>
    issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">加载中...</span>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Issues</h1>
            <p className="text-sm text-muted-foreground mt-1">
              管理产品建议、功能需求和问题反馈
            </p>
          </div>
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
        </div>

        {/* 顶部操作栏 */}
        <div className="flex items-center gap-4">
          {/* 搜索框 */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="搜索Issues..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* 创建Issue按钮 */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-10">
                <Plus className="h-4 w-4 mr-2" />
                创建Issue
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>创建新Issue</DialogTitle>
                <DialogDescription>
                  创建产品建议、功能需求或其他工作项
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">标题 *</label>
                  <Input
                    placeholder="简洁描述这个Issue"
                    value={newIssue.title}
                    onChange={(e) => setNewIssue({...newIssue, title: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">项目 *</label>
                  <Select 
                    value={newIssue.projectId} 
                    onValueChange={(value) => setNewIssue({...newIssue, projectId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择项目" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">详细描述</label>
                  <Textarea
                    placeholder="详细描述背景、需求和期望结果"
                    value={newIssue.description}
                    onChange={(e) => setNewIssue({...newIssue, description: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">类型</label>
                    <Select 
                      value={newIssue.issueType} 
                      onValueChange={(value) => setNewIssue({...newIssue, issueType: value as IssueType})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(issueTypeConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">优先级</label>
                    <Select 
                      value={newIssue.priority} 
                      onValueChange={(value) => setNewIssue({...newIssue, priority: value as Priority})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(priorityConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">负责人</label>
                  <Select 
                    value={newIssue.assigneeId} 
                    onValueChange={(value) => setNewIssue({...newIssue, assigneeId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择负责人" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">未分配</SelectItem>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleCreateIssue}
                  disabled={!newIssue.title || !newIssue.projectId || creating}
                >
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  创建Issue
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Issues表格 */}
        <div className="rounded-md border">
          <Table>
            <TableHeaderRaw>
              <TableRowRaw>
                <TableHeadRaw>类型</TableHeadRaw>
                <TableHeadRaw>标题</TableHeadRaw>
                <TableHeadRaw>状态</TableHeadRaw>
                <TableHeadRaw>优先级</TableHeadRaw>
                <TableHeadRaw>负责人</TableHeadRaw>
                <TableHeadRaw>创建时间</TableHeadRaw>
              </TableRowRaw>
            </TableHeaderRaw>
            <TableBodyRaw>
              {filteredIssues.length > 0 ? (
                filteredIssues.map((issue) => (
                  <TableRowRaw key={issue.id}>
                    <TableCellRaw>
                      <Badge className={issueTypeConfig[issue.issueType]?.color}>
                        {issueTypeConfig[issue.issueType]?.label}
                      </Badge>
                    </TableCellRaw>
                    <TableCellRaw>
                      <div className="max-w-md">
                        <div className="font-medium">{issue.title}</div>
                        {issue.description && (
                          <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {issue.description}
                          </div>
                        )}
                      </div>
                    </TableCellRaw>
                    <TableCellRaw>
                      <Badge className={statusConfig[issue.status]?.color}>
                        {statusConfig[issue.status]?.label}
                      </Badge>
                    </TableCellRaw>
                    <TableCellRaw>
                      <Badge variant="outline" className={priorityConfig[issue.priority]?.color}>
                        {priorityConfig[issue.priority]?.label}
                      </Badge>
                    </TableCellRaw>
                    <TableCellRaw>
                      {issue.assignee?.name || '未分配'}
                    </TableCellRaw>
                    <TableCellRaw className="text-sm">
                      {new Date(issue.createdAt).toLocaleDateString('zh-CN')}
                    </TableCellRaw>
                  </TableRowRaw>
                ))
              ) : (
                <TableRowRaw>
                  <TableCellRaw colSpan={6} className="h-24 text-center">
                    {searchTerm ? '没有找到匹配的Issues' : '暂无Issues数据'}
                  </TableCellRaw>
                </TableRowRaw>
              )}
            </TableBodyRaw>
          </Table>
        </div>

        {/* 统计信息 */}
        {issues.length > 0 && (
          <div className="text-sm text-muted-foreground">
            共 {issues.length} 个Issues，显示 {filteredIssues.length} 个
          </div>
        )}
      </div>
    </AppLayout>
  );
}
