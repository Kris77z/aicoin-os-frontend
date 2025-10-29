'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableHeader as TableHeaderRaw,
  TableBody as TableBodyRaw,
  TableRow as TableRowRaw,
  TableCell as TableCellRaw,
  TableHead as TableHeadRaw,
} from '@/components/ui/table';
import { KanbanProvider, KanbanBoard, KanbanCard, KanbanHeader, KanbanCards } from '@/components/ui/kanban';
import { issueApi } from '@/lib/api';
import type { Issue } from '@/types/issue';
import Link from 'next/link';
import { Eye, Plus, List, LayoutGrid } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';

// 优先级配置
const priorityConfig = {
  LOW: { label: '低', color: 'bg-gray-100 text-gray-800' },
  MEDIUM: { label: '中', color: 'bg-yellow-100 text-yellow-800' },
  HIGH: { label: '高', color: 'bg-orange-100 text-orange-800' },
  URGENT: { label: '紧急', color: 'bg-red-100 text-red-800' },
};

// 视图模式
type ViewMode = 'list' | 'kanban';

// 版本类型
interface Version {
  id: string;
  name: string; // 如 v1.0.0
  app: string; // 应用端
  releaseDate: Date; // 上线时间
  issues: Issue[];
}

export default function VersionManagementPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 视图模式
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // 版本列表（从issues中提取）
  const [versions, setVersions] = useState<string[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('all');
  
  // 新增版本对话框
  const [createVersionDialogOpen, setCreateVersionDialogOpen] = useState(false);
  const [newVersion, setNewVersion] = useState({
    app: '',
    version: '',
    releaseDate: undefined as Date | undefined,
  });

  // 加载Issues数据 - 加载pm/issues项目（ID: 1206）的所有数据
  const loadIssues = async () => {
    try {
      setLoading(true);
      setError(null);
      // 获取所有GitLab同步的数据
      const response = await issueApi.getIssues({}, { take: 1000 });
      
      // 前端筛选：只显示 gitlabProjectId === 1206 的Issue
      const versionIssues = response.issues.issues.filter(
        (issue: Issue) => issue.gitlabProjectId === 1206
      );
      
      console.log('版本管理数据:', versionIssues.length, '条（来自pm/issues项目 1206）');
      setIssues(versionIssues);
      
      // 提取版本列表（从labels中提取V:开头的标签）
      const versionSet = new Set<string>();
      versionIssues.forEach((issue: Issue) => {
        if (issue.gitlabLabels) {
          issue.gitlabLabels.forEach(label => {
            if (label.startsWith('V:')) {
              versionSet.add(label.replace('V:', '').trim());
            }
          });
        }
      });
      
      const versionList = Array.from(versionSet).sort();
      setVersions(versionList);
      
      // 默认选择第一个版本
      if (versionList.length > 0 && selectedVersion === 'all') {
        setSelectedVersion(versionList[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
      console.error('Failed to load issues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, []);

  // 从GitLab标签提取类型信息
  const getTypeFromLabels = (labels: string[] | undefined) => {
    if (!labels) return '-';
    const cLabel = labels.find(label => label.startsWith('C:'));
    if (cLabel) {
      return cLabel.replace('C:', '').trim();
    }
    return '-';
  };

  // 从GitLab标签提取版本信息
  const getVersionFromLabels = (labels: string[] | undefined) => {
    if (!labels) return '未分配';
    const vLabel = labels.find(label => label.startsWith('V:'));
    if (vLabel) {
      return vLabel.replace('V:', '').trim();
    }
    return '未分配';
  };

  // 过滤Issues（按版本）
  const filteredIssues = selectedVersion === 'all' 
    ? issues 
    : issues.filter(issue => getVersionFromLabels(issue.gitlabLabels) === selectedVersion);

  // 按版本分组Issues（用于看板视图）
  const groupedByVersion: Record<string, Issue[]> = {};
  
  versions.forEach(version => {
    groupedByVersion[version] = issues.filter(
      issue => getVersionFromLabels(issue.gitlabLabels) === version
    );
  });
  
  // 未分配版本的Issues
  groupedByVersion['未分配'] = issues.filter(
    issue => getVersionFromLabels(issue.gitlabLabels) === '未分配'
  );

  // 打开创建版本对话框
  const openCreateVersionDialog = () => {
    setNewVersion({
      app: '',
      version: '',
      releaseDate: undefined,
    });
    setCreateVersionDialogOpen(true);
  };

  // 关闭创建版本对话框
  const closeCreateVersionDialog = () => {
    setCreateVersionDialogOpen(false);
  };

  // 创建新版本
  const handleCreateVersion = async () => {
    if (!newVersion.app || !newVersion.version || !newVersion.releaseDate) {
      alert('请填写完整信息');
      return;
    }

    try {
      console.log('创建新版本:', newVersion);
      // TODO: 调用后端API创建版本
      // await versionApi.createVersion(newVersion);
      
      alert('版本创建成功（后端API待实现）');
      closeCreateVersionDialog();
      loadIssues();
    } catch (err) {
      console.error('Failed to create version:', err);
      alert(`创建失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  };

  // 渲染列表视图
  const renderListView = () => (
    <div className="rounded-md border overflow-x-auto">
      <Table className="min-w-full">
        <TableHeaderRaw>
          <TableRowRaw>
            <TableHeadRaw className="w-[40%]">标题</TableHeadRaw>
            <TableHeadRaw>优先级</TableHeadRaw>
            <TableHeadRaw>版本</TableHeadRaw>
            <TableHeadRaw>负责人</TableHeadRaw>
            <TableHeadRaw>更新时间</TableHeadRaw>
            <TableHeadRaw className="text-right">操作</TableHeadRaw>
          </TableRowRaw>
        </TableHeaderRaw>
        <TableBodyRaw>
          {loading ? (
            <TableRowRaw>
              <TableCellRaw colSpan={6} className="h-24 text-center">
                加载中...
              </TableCellRaw>
            </TableRowRaw>
          ) : error ? (
            <TableRowRaw>
              <TableCellRaw colSpan={6} className="h-24 text-center text-red-600">
                {error}
              </TableCellRaw>
            </TableRowRaw>
          ) : filteredIssues.length > 0 ? (
            filteredIssues.map((issue) => (
              <TableRowRaw key={issue.id} className="hover:bg-muted/50">
                <TableCellRaw>
                  <Link 
                    href={`/demand_pool/${issue.id}`} 
                    className="font-medium hover:underline block truncate max-w-[400px]"
                    title={issue.title}
                  >
                    {issue.title}
                  </Link>
                </TableCellRaw>
                <TableCellRaw>
                  <Badge variant="outline" className={priorityConfig[issue.priority]?.color}>
                    {priorityConfig[issue.priority]?.label}
                  </Badge>
                </TableCellRaw>
                <TableCellRaw>
                  <Badge variant="outline" className="text-xs">
                    {getVersionFromLabels(issue.gitlabLabels)}
                  </Badge>
                </TableCellRaw>
                <TableCellRaw>
                  <div className="flex items-center gap-2">
                    {issue.assignee ? (
                      <>
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={`https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${issue.assignee.username}`} />
                          <AvatarFallback>{issue.assignee.name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate max-w-[100px]" title={issue.assignee.name}>
                          {issue.assignee.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">未分配</span>
                    )}
                  </div>
                </TableCellRaw>
                <TableCellRaw>
                  <div className="text-sm text-muted-foreground">
                    {issue.gitlabUpdatedAt 
                      ? new Date(issue.gitlabUpdatedAt).toLocaleString('zh-CN', { 
                          year: 'numeric', 
                          month: '2-digit', 
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : new Date(issue.updatedAt || issue.createdAt).toLocaleString('zh-CN', { 
                          year: 'numeric', 
                          month: '2-digit', 
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                    }
                  </div>
                </TableCellRaw>
                <TableCellRaw>
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/demand_pool/${issue.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        详情
                      </Link>
                    </Button>
                  </div>
                </TableCellRaw>
              </TableRowRaw>
            ))
          ) : (
            <TableRowRaw>
              <TableCellRaw colSpan={6} className="h-24 text-center">
                暂无数据
              </TableCellRaw>
            </TableRowRaw>
          )}
        </TableBodyRaw>
      </Table>
    </div>
  );

  // 渲染看板视图
  const renderKanbanView = () => (
    <KanbanProvider onDragEnd={() => {}}>
      {/* 未分配列 */}
      <KanbanBoard id="unassigned">
        <KanbanHeader name="未分配" color="#6B7280" />
        <KanbanCards>
          {(groupedByVersion['未分配'] || []).map((issue, index) => (
            <KanbanCard 
              key={issue.id} 
              id={issue.id} 
              name={issue.title}
              index={index}
              parent="unassigned"
            >
              <div className="space-y-2">
                <p className="m-0 font-medium text-sm line-clamp-2">{issue.title}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {getTypeFromLabels(issue.gitlabLabels)}
                  </Badge>
                  <Badge variant="outline" className={priorityConfig[issue.priority]?.color + ' text-xs'}>
                    {priorityConfig[issue.priority]?.label}
                  </Badge>
                </div>
                {issue.assignee && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={`https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${issue.assignee.username}`} />
                      <AvatarFallback className="text-xs">{issue.assignee.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground truncate">{issue.assignee.name}</span>
                  </div>
                )}
              </div>
            </KanbanCard>
          ))}
        </KanbanCards>
      </KanbanBoard>

      {/* 各版本列 */}
      {versions.map(version => (
        <KanbanBoard key={version} id={version}>
          <KanbanHeader name={version} color="#3B82F6" />
          <KanbanCards>
            {(groupedByVersion[version] || []).map((issue, index) => (
              <KanbanCard 
                key={issue.id} 
                id={issue.id} 
                name={issue.title}
                index={index}
                parent={version}
              >
                <div className="space-y-2">
                  <p className="m-0 font-medium text-sm line-clamp-2">{issue.title}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {getTypeFromLabels(issue.gitlabLabels)}
                    </Badge>
                    <Badge variant="outline" className={priorityConfig[issue.priority]?.color + ' text-xs'}>
                      {priorityConfig[issue.priority]?.label}
                    </Badge>
                  </div>
                  {issue.assignee && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={`https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${issue.assignee.username}`} />
                        <AvatarFallback className="text-xs">{issue.assignee.name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground truncate">{issue.assignee.name}</span>
                    </div>
                  )}
                </div>
              </KanbanCard>
            ))}
          </KanbanCards>
        </KanbanBoard>
      ))}
    </KanbanProvider>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* 顶部操作栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* 版本选择器（列表视图时显示） */}
            {viewMode === 'list' && (
              <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="选择版本" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部版本</SelectItem>
                  {versions.map(version => (
                    <SelectItem key={version} value={version}>
                      {version}
                    </SelectItem>
                  ))}
                  <SelectItem value="未分配">未分配</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            {/* 统计信息 */}
            <div className="text-sm text-muted-foreground">
              共 {filteredIssues.length} 个需求
              {viewMode === 'list' && selectedVersion !== 'all' && ` （${selectedVersion}）`}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 视图切换 */}
            <div className="bg-background border border-border rounded-md p-1 h-10 flex items-center gap-1">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 px-3"
              >
                <List className="h-4 w-4 mr-1" />
                列表
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className="h-8 px-3"
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                看板
              </Button>
            </div>

            {/* 新增版本按钮 */}
            <Button onClick={openCreateVersionDialog}>
              <Plus className="h-4 w-4 mr-2" />
              新增版本
            </Button>
          </div>
        </div>

        {/* 视图内容 */}
        {viewMode === 'list' ? renderListView() : renderKanbanView()}
      </div>

      {/* 新增版本对话框 */}
      <Dialog open={createVersionDialogOpen} onOpenChange={setCreateVersionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新增版本</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* 应用端 */}
            <div className="space-y-2">
              <Label htmlFor="app">应用端 *</Label>
              <Select value={newVersion.app} onValueChange={(value) => setNewVersion({...newVersion, app: value})}>
                <SelectTrigger id="app">
                  <SelectValue placeholder="选择应用端" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AiCoin PC">AiCoin PC</SelectItem>
                  <SelectItem value="AiCoin IOS">AiCoin IOS</SelectItem>
                  <SelectItem value="AiCoin Android">AiCoin Android</SelectItem>
                  <SelectItem value="AiCoin Web">AiCoin Web</SelectItem>
                  <SelectItem value="BBX IOS">BBX IOS</SelectItem>
                  <SelectItem value="BBX Android">BBX Android</SelectItem>
                  <SelectItem value="BBX Web">BBX Web</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 版本号 */}
            <div className="space-y-2">
              <Label htmlFor="version">版本号 *</Label>
              <Input
                id="version"
                placeholder="如：v1.0.0"
                value={newVersion.version}
                onChange={(e) => setNewVersion({...newVersion, version: e.target.value})}
              />
            </div>

            {/* 上线时间 */}
            <div className="space-y-2">
              <Label htmlFor="releaseDate">上线时间 *</Label>
              <DatePicker
                date={newVersion.releaseDate}
                onDateChange={(date) => setNewVersion({...newVersion, releaseDate: date})}
                placeholder="选择上线日期"
              />
              <p className="text-xs text-muted-foreground">
                创建成功后系统会自动记录开始时间
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeCreateVersionDialog}>
              取消
            </Button>
            <Button 
              onClick={handleCreateVersion}
              disabled={!newVersion.app || !newVersion.version || !newVersion.releaseDate}
            >
              创建版本
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
