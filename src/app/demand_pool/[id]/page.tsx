'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { issueApi, userApi } from '@/lib/api';
import type { Issue, User } from '@/types/issue';
import { ArrowLeft, FileText, ExternalLink } from 'lucide-react';

// 优先级配置
const priorityConfig = {
  LOW: { label: '低', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
  MEDIUM: { label: '中', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
  HIGH: { label: '高', bgColor: 'bg-orange-100', textColor: 'text-orange-800' },
  URGENT: { label: '紧急', bgColor: 'bg-red-100', textColor: 'text-red-800' },
};

// 状态配置
const statusConfig = {
  OPEN: { label: '待处理', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
  IN_DISCUSSION: { label: '讨论中', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
  APPROVED: { label: '已批准', bgColor: 'bg-green-100', textColor: 'text-green-800' },
  IN_PRD: { label: 'PRD中', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
  IN_DEVELOPMENT: { label: '开发中', bgColor: 'bg-orange-100', textColor: 'text-orange-800' },
  IN_TESTING: { label: '测试中', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
  IN_ACCEPTANCE: { label: '验收中', bgColor: 'bg-indigo-100', textColor: 'text-indigo-800' },
  COMPLETED: { label: '已完成', bgColor: 'bg-green-100', textColor: 'text-green-800' },
  REJECTED: { label: '已拒绝', bgColor: 'bg-red-100', textColor: 'text-red-800' },
  CANCELLED: { label: '已取消', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
};

// 需求阶段配置
const stageConfig = {
  FEEDBACK: { label: '反馈池', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
  SCHEDULED: { label: '已排期', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
  IN_PROGRESS: { label: '进行中', bgColor: 'bg-orange-100', textColor: 'text-orange-800' },
  RELEASED: { label: '已发布', bgColor: 'bg-green-100', textColor: 'text-green-800' },
  REJECTED: { label: '已拒绝', bgColor: 'bg-red-100', textColor: 'text-red-800' },
  ARCHIVED: { label: '已归档', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
};

// 输入源配置
const inputSourceConfig = {
  INTERNAL: { label: '内部', icon: '🏢' },
  CLIENT: { label: '客户', icon: '👤' },
  MARKET: { label: '市场', icon: '📊' },
  COMPETITOR: { label: '竞品', icon: '⚔️' },
  FEEDBACK: { label: '用户反馈', icon: '💬' },
  BUG: { label: 'Bug修复', icon: '🐛' },
};

// Issue类型配置
const issueTypeConfig = {
  FEATURE: { label: '新功能', icon: '✨' },
  ENHANCEMENT: { label: '功能优化', icon: '⚡' },
  BUG_FIX: { label: 'Bug修复', icon: '🐛' },
  TECHNICAL_DEBT: { label: '技术债', icon: '🔧' },
  RESEARCH: { label: '研究', icon: '🔬' },
  OPTIMIZATION: { label: '性能优化', icon: '🚀' },
};

export default function DemandDetailPage() {
  const params = useParams();
  const issueId = params.id as string;
  
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 评审对话框状态
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [approvalComment, setApprovalComment] = useState<string>('');
  const [approvalLevel, setApprovalLevel] = useState<'level1' | 'level2' | 'level3'>('level1');
  const [selectedApprover, setSelectedApprover] = useState<string>('');
  const [approvers, setApprovers] = useState<User[]>([]);
  const [approving, setApproving] = useState(false);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [issueResponse, usersResponse] = await Promise.all([
          issueApi.getIssue(issueId),
          userApi.getUsers({})
        ]);
        
        setIssue(issueResponse.issue);
        setApprovers((usersResponse.users.users || []).slice(0, 10));
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (issueId) {
      loadData();
    }
  }, [issueId]);

  const handleBack = () => {
    window.history.back();
  };

  // 打开评审对话框
  const openApproveDialog = () => {
    setSelectedVersion('');
    setApprovalComment('');
    setApprovalLevel('level1');
    setSelectedApprover('');
    setApproveDialogOpen(true);
  };

  // 关闭评审对话框
  const closeApproveDialog = () => {
    setApproveDialogOpen(false);
    setSelectedVersion('');
    setApprovalComment('');
    setSelectedApprover('');
  };

  // 审批级别变更
  const handleApprovalLevelChange = (level: 'level1' | 'level2' | 'level3') => {
    setApprovalLevel(level);
    setSelectedApprover('');
  };

  // 执行评审
  const handleApproveIssue = async () => {
    if (!issue || !selectedVersion || !approvalComment || !selectedApprover) {
      alert('请填写完整信息：版本、评审意见和审批人');
      return;
    }

    try {
      setApproving(true);
      
      console.log('评审提交:', {
        issueId: issue.id,
        version: selectedVersion,
        comment: approvalComment,
        level: approvalLevel,
        approverId: selectedApprover,
      });
      
      // 临时使用旧的API
      await issueApi.approveIssue(issue.id, selectedApprover);
      
      // 重新加载数据
      const issueResponse = await issueApi.getIssue(issueId);
      setIssue(issueResponse.issue);
      
      closeApproveDialog();
      
      if (approvalLevel === 'level3') {
        alert('最终评审通过，需求已移至排期管理');
      } else {
        alert(`第${approvalLevel === 'level1' ? '一' : '二'}级评审提交成功，已转交下一级审批人`);
      }
    } catch (err) {
      console.error('Failed to approve issue:', err);
      alert(`评审失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setApproving(false);
    }
  };

  // 从GitLab标签提取类型信息
  const getTypeFromLabels = (labels: string[] | undefined) => {
    if (!labels) return '-';
    const cLabel = labels.find(label => label.startsWith('C:'));
    if (cLabel) {
      return cLabel.replace('C:', '').trim();
    }
    return '-';
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-lg">加载中...</div>
            <div className="text-sm text-muted-foreground mt-2">正在加载需求详情</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !issue) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-lg text-red-600">加载失败</div>
            <div className="text-sm text-muted-foreground mt-2">{error || '需求不存在'}</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              返回
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：需求信息 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 基本信息卡片 */}
              <Card>
                <CardHeader>
                  <CardTitle>基本信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 标题 */}
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">标题</div>
                    <h2 className="text-lg font-semibold">{issue.title}</h2>
                  </div>

                  {/* GitLab信息 */}
                  {issue.gitlabUrl && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">GitLab链接</div>
                      <a 
                        href={issue.gitlabUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {issue.gitlabProjectId}/#{issue.gitlabIssueIid}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {/* 阶段 */}
                    {issue.stage && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-2">需求阶段</div>
                        <Badge className={`${stageConfig[issue.stage as keyof typeof stageConfig]?.bgColor || 'bg-gray-100'} ${stageConfig[issue.stage as keyof typeof stageConfig]?.textColor || 'text-gray-800'}`}>
                          {stageConfig[issue.stage as keyof typeof stageConfig]?.label || issue.stage}
                        </Badge>
                      </div>
                    )}

                    {/* 状态 */}
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">状态</div>
                      <Badge className={`${statusConfig[issue.status as keyof typeof statusConfig]?.bgColor || 'bg-gray-100'} ${statusConfig[issue.status as keyof typeof statusConfig]?.textColor || 'text-gray-800'}`}>
                        {statusConfig[issue.status as keyof typeof statusConfig]?.label || issue.status}
                      </Badge>
                    </div>

                    {/* 优先级 */}
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">优先级</div>
                      <Badge className={`${priorityConfig[issue.priority as keyof typeof priorityConfig]?.bgColor || 'bg-gray-100'} ${priorityConfig[issue.priority as keyof typeof priorityConfig]?.textColor || 'text-gray-800'}`}>
                        {priorityConfig[issue.priority as keyof typeof priorityConfig]?.label || issue.priority}
                      </Badge>
                    </div>

                    {/* GitLab状态 */}
                    {issue.gitlabState && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-2">GitLab状态</div>
                        <Badge variant="outline">
                          {issue.gitlabState === 'opened' ? '开放中' : '已关闭'}
                        </Badge>
                      </div>
                    )}

                    {/* Issue类型 */}
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">需求类型</div>
                      <div className="text-sm flex items-center gap-1">
                        <span>{issueTypeConfig[issue.issueType as keyof typeof issueTypeConfig]?.icon || '📝'}</span>
                        <span>{issueTypeConfig[issue.issueType as keyof typeof issueTypeConfig]?.label || issue.issueType}</span>
                      </div>
                    </div>

                    {/* 输入源 */}
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">来源</div>
                      <div className="text-sm flex items-center gap-1">
                        <span>{inputSourceConfig[issue.inputSource as keyof typeof inputSourceConfig]?.icon || '📌'}</span>
                        <span>{inputSourceConfig[issue.inputSource as keyof typeof inputSourceConfig]?.label || issue.inputSource}</span>
                      </div>
                    </div>

                    {/* GitLab标签类型 */}
                    {issue.gitlabLabels && issue.gitlabLabels.length > 0 && (
                      <div className="col-span-2">
                        <div className="text-sm font-medium text-muted-foreground mb-2">GitLab标签</div>
                        <div className="flex flex-wrap gap-2">
                          {issue.gitlabLabels.map((label, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 描述 */}
                  {issue.description && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">描述</div>
                      <div className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                        {issue.description}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 人员信息卡片 */}
              <Card>
                <CardHeader>
                  <CardTitle>人员信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* 提交人 */}
                    {issue.creator && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-2">提交人</div>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={`https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${issue.creator.username}`} />
                            <AvatarFallback>{issue.creator.name?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium">{issue.creator.name}</div>
                            <div className="text-xs text-muted-foreground">{issue.creator.email}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 负责人 */}
                    {issue.assignee && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-2">负责人</div>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={`https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${issue.assignee.username}`} />
                            <AvatarFallback>{issue.assignee.name?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium">{issue.assignee.name}</div>
                            <div className="text-xs text-muted-foreground">{issue.assignee.email}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 时间信息卡片 */}
              <Card>
                <CardHeader>
                  <CardTitle>时间信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* GitLab创建时间 */}
                    {issue.gitlabCreatedAt && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-2">GitLab创建时间</div>
                        <div className="text-sm">
                          {new Date(issue.gitlabCreatedAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                    )}

                    {/* GitLab更新时间 */}
                    {issue.gitlabUpdatedAt && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-2">GitLab更新时间</div>
                        <div className="text-sm">
                          {new Date(issue.gitlabUpdatedAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                    )}

                    {/* 最后同步时间 */}
                    {issue.lastSyncedAt && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-2">最后同步时间</div>
                        <div className="text-sm">
                          {new Date(issue.lastSyncedAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                    )}

                    {/* 预期完成时间 */}
                    {issue.dueDate && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-2">预期完成时间</div>
                        <div className="text-sm">
                          {new Date(issue.dueDate).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 业务价值信息卡片 */}
              {(issue.businessValue || issue.userImpact || issue.technicalRisk) && (
                <Card>
                  <CardHeader>
                    <CardTitle>业务评估</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {issue.businessValue && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-2">商业价值</div>
                        <div className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                          {issue.businessValue}
                        </div>
                      </div>
                    )}

                    {issue.userImpact && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-2">用户影响</div>
                        <div className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                          {issue.userImpact}
                        </div>
                      </div>
                    )}

                    {issue.technicalRisk && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-2">技术风险</div>
                        <div className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                          {issue.technicalRisk}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* 右侧：评审功能 */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>需求评审</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 评审状态显示 */}
                  <div className="bg-muted/50 p-4 rounded-md space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">当前阶段</span>
                      <Badge className={`${stageConfig[issue.stage as keyof typeof stageConfig]?.bgColor || 'bg-gray-100'} ${stageConfig[issue.stage as keyof typeof stageConfig]?.textColor || 'text-gray-800'}`}>
                        {stageConfig[issue.stage as keyof typeof stageConfig]?.label || issue.stage}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">GitLab状态</span>
                      <Badge variant="outline">
                        {issue.gitlabState === 'opened' ? '开放中' : '已关闭'}
                      </Badge>
                    </div>
                  </div>

                  {/* 评审说明 */}
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p className="font-medium text-foreground">评审流程：</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>第一级：端负责人评审技术可行性</li>
                      <li>第二级：部门经理评审业务优先级</li>
                      <li>第三级：总监/VP最终审批</li>
                    </ol>
                  </div>

                  {/* 评审按钮 */}
                  {issue.gitlabState === 'opened' && (
                    <Button 
                      onClick={openApproveDialog}
                      className="w-full"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      开始评审
                    </Button>
                  )}

                  {issue.gitlabState === 'closed' && (
                    <div className="text-sm text-center text-muted-foreground py-4">
                      该需求已在GitLab中关闭
                    </div>
                  )}

                  {/* 评审历史（待实现） */}
                  <div className="border-t pt-4">
                    <div className="text-sm font-medium mb-2">评审历史</div>
                    <div className="text-xs text-muted-foreground text-center py-4">
                      暂无评审记录
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* 评审对话框 */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>需求评审 - {issue?.title}</DialogTitle>
            <DialogDescription>
              请填写评审信息并选择下一级审批人
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* 开发版本 */}
            <div className="space-y-2">
              <Label htmlFor="version">开发版本 *</Label>
              <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                <SelectTrigger id="version">
                  <SelectValue placeholder="选择开发版本" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="v1.0.0">v1.0.0</SelectItem>
                  <SelectItem value="v1.1.0">v1.1.0</SelectItem>
                  <SelectItem value="v1.2.0">v1.2.0</SelectItem>
                  <SelectItem value="v2.0.0">v2.0.0</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 审批级别 */}
            <div className="space-y-2">
              <Label>审批级别 *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={approvalLevel === 'level1' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleApprovalLevelChange('level1')}
                >
                  第一级（端负责人）
                </Button>
                <Button
                  type="button"
                  variant={approvalLevel === 'level2' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleApprovalLevelChange('level2')}
                >
                  第二级（部门经理）
                </Button>
                <Button
                  type="button"
                  variant={approvalLevel === 'level3' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleApprovalLevelChange('level3')}
                >
                  第三级（总监/VP）
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {approvalLevel === 'level1' && '第一级：各端负责人初步评审需求的技术可行性和资源评估'}
                {approvalLevel === 'level2' && '第二级：部门经理评审需求的优先级和业务价值'}
                {approvalLevel === 'level3' && '第三级：总监/VP最终审批，通过后移至排期管理'}
              </p>
            </div>

            {/* 下一级审批人 */}
            <div className="space-y-2">
              <Label htmlFor="approver">下一级审批人 *</Label>
              <Select value={selectedApprover} onValueChange={setSelectedApprover}>
                <SelectTrigger id="approver">
                  <SelectValue placeholder="选择审批人" />
                </SelectTrigger>
                <SelectContent>
                  {approvers.map((approver) => (
                    <SelectItem key={approver.id} value={approver.id}>
                      {approver.name} ({approver.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 评审意见 */}
            <div className="space-y-2">
              <Label htmlFor="comment">评审意见 *</Label>
              <Textarea
                id="comment"
                placeholder="请输入评审意见..."
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeApproveDialog} disabled={approving}>
              取消
            </Button>
            <Button 
              onClick={handleApproveIssue} 
              disabled={approving || !selectedVersion || !approvalComment || !selectedApprover}
            >
              {approving ? '提交中...' : '提交评审'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
