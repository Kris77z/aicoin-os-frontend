'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

import { DatePicker } from '@/components/ui/date-picker';
import { FormField, FormFieldGroup } from '@/components/ui/form-field';
import { WysiwygEditor } from '@/components/ui/wysiwyg-editor';
import { issueApi, projectApi, userApi } from '@/lib/api';
import type { Priority, InputSource, IssueType } from '@/types/issue';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Save,
  Send
} from 'lucide-react';


// 输入源配置
const inputSourceConfig = {
  USER_FEEDBACK: { label: '用户反馈', value: 'USER_FEEDBACK' as InputSource },
  INTERNAL: { label: '内部反馈', value: 'INTERNAL' as InputSource },
  DATA_ANALYSIS: { label: '数据分析', value: 'DATA_ANALYSIS' as InputSource },
  STRATEGY: { label: '战略需求', value: 'STRATEGY' as InputSource },
};

// 配置对象
const issueTypeConfig = {
  FEATURE: { label: '新功能', color: '#10B981' },
  ENHANCEMENT: { label: '功能增强', color: '#3B82F6' },
  BUG_FIX: { label: 'Bug修复', color: '#EF4444' },
  TECHNICAL_DEBT: { label: '技术债务', color: '#F59E0B' },
  RESEARCH: { label: '技术调研', color: '#8B5CF6' },
};

const priorityConfig = {
  LOW: { label: '低', color: '#6B7280' },
  MEDIUM: { label: '中', color: '#F59E0B' },
  HIGH: { label: '高', color: '#EF4444' },
  URGENT: { label: '紧急', color: '#DC2626' },
};



interface IssueFormData {
  title: string;
  projectId: string;
  versionId: string;
  description: string;
  assigneeId: string;
  reviewerId: string;
  startDate?: Date;
  dueDate?: Date;
  priority: Priority;
  issueType: IssueType;
  inputSource: InputSource;
}

export default function CreateIssuePage() {
  const [formData, setFormData] = useState<IssueFormData>({
    title: '',
    projectId: '',
    versionId: '',
    description: '',
    assigneeId: '',
    reviewerId: '',
    priority: 'MEDIUM' as Priority,
    issueType: 'FEATURE' as IssueType,
    inputSource: 'USER_FEEDBACK' as InputSource,
  });

  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<Array<{id: string; name: string; key: string}>>([]);
  const [users, setUsers] = useState<Array<{id: string; name: string; email: string; username: string}>>([]);
  const [versions] = useState<Array<{id: string; name: string; description: string}>>([
    { id: 'v1.0.0', name: 'v1.0.0', description: '第一个正式版本' },
    { id: 'v1.1.0', name: 'v1.1.0', description: '功能增强版本' },
    { id: 'v2.0.0', name: 'v2.0.0', description: '重大更新版本' },
  ]);
  const [loading, setLoading] = useState(true);

  // 加载项目和用户数据
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [projectsResponse, usersResponse] = await Promise.all([
          projectApi.getProjects(),
          userApi.getUsers()
        ]);
        
        setProjects(projectsResponse.projects.projects);
        setUsers(usersResponse.users.users);
      } catch (error) {
        console.error('Failed to load data:', error);
        alert('加载数据失败，请刷新重试');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleBack = () => {
    window.history.back();
  };

  const handleSave = async () => {
    if (!formData.title || !formData.projectId) {
      alert('请填写标题和选择项目');
      return;
    }

    setSaving(true);
    try {
      await issueApi.createIssue({
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        inputSource: formData.inputSource,
        issueType: formData.issueType,
        projectId: formData.projectId,
        assigneeId: formData.assigneeId || undefined,
        dueDate: formData.dueDate?.toISOString() || undefined,
      });
      
      alert('Issue创建成功！');
      // 跳转到Issues列表页
      window.location.href = '/issues';
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-lg">加载中...</div>
            <div className="text-sm text-muted-foreground mt-2">正在加载项目和用户数据</div>
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
            <div>
              <h1 className="text-xl font-semibold">新建 Issue</h1>
            </div>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleSave}
              disabled={saving}
              variant="outline"
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              保存草稿
            </Button>
            
            <Button 
              onClick={handleSave}
              disabled={saving || !formData.title}
              size="sm"
            >
              <Send className="h-4 w-4 mr-2" />
              {saving ? '提交中...' : '提交Issue'}
            </Button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* 主要内容区域 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 左侧主要信息 - 占2列 */}
              <div className="lg:col-span-2">
                <FormFieldGroup>
                  {/* 标题 */}
                  <FormField label="标题" required>
                    <Input
                      placeholder="简洁描述这个Issue"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                    />
                  </FormField>

                  {/* 第一行：所属项目、所属版本 */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="所属项目" required>
                      <Select 
                        value={formData.projectId} 
                        onValueChange={(value) => setFormData({...formData, projectId: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择项目" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map(project => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name} ({project.key})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField label="所属版本">
                      <Select 
                        value={formData.versionId} 
                        onValueChange={(value) => setFormData({...formData, versionId: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择版本" />
                        </SelectTrigger>
                        <SelectContent>
                          {versions.map(version => (
                            <SelectItem key={version.id} value={version.id}>
                              <div className="flex flex-col">
                                <span>{version.name}</span>
                                <span className="text-xs text-muted-foreground">{version.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>

                  {/* 第二行：Issue类型、输入源 */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Issue类型">
                      <Select 
                        value={formData.issueType} 
                        onValueChange={(value) => setFormData({...formData, issueType: value as IssueType})}
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
                    </FormField>

                    <FormField label="输入源">
                      <Select 
                        value={formData.inputSource} 
                        onValueChange={(value) => setFormData({...formData, inputSource: value as InputSource})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(inputSourceConfig).map(([key, config]) => (
                            <SelectItem key={key} value={config.value}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>



                  {/* 描述 - 使用所见即所得编辑器 */}
                  <FormField label="描述">
                    <WysiwygEditor
                      value={formData.description}
                      onChange={(value) => setFormData({...formData, description: value})}
                      placeholder="详细描述需求背景、功能规格、用户场景等...

可以包含以下内容：
• 商业价值：描述这个需求的商业价值和预期收益
• 用户影响：描述对用户的影响范围和程度  
• 技术风险：评估技术实现的风险和复杂度
• 功能详情：具体的功能需求和实现方案"
                      minHeight="300px"
                      showHelpText={false}
                    />
                  </FormField>
                </FormFieldGroup>
              </div>

              {/* 右侧其他信息卡片 - 占1列 */}
              <div className="lg:col-span-1">
                <Card className="border border-border shadow-none py-0">
                  <CardContent className="p-6" style={{ padding: '24px' }}>
                    <FormFieldGroup>
                      {/* 负责人 */}
                      <FormField label="负责人 (Assignee)">
                        <Select 
                          value={formData.assigneeId} 
                          onValueChange={(value) => setFormData({...formData, assigneeId: value})}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="选择负责人" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map(user => (
                              <SelectItem key={user.id} value={user.id}>
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                                    {user.name[0]}
                                  </div>
                                  <span>{user.name}</span>
                                  <span className="text-xs text-muted-foreground">({user.email})</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>

                      {/* 审核人 */}
                      <FormField label="审核人 (Reviewer)">
                        <Select 
                          value={formData.reviewerId} 
                          onValueChange={(value) => setFormData({...formData, reviewerId: value})}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="选择审核人" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map(user => (
                              <SelectItem key={user.id} value={user.id}>
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                                    {user.name[0]}
                                  </div>
                                  <span>{user.name}</span>
                                  <span className="text-xs text-muted-foreground">({user.email})</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>

                      {/* 优先级 */}
                      <FormField label="优先级">
                        <Select 
                          value={formData.priority} 
                          onValueChange={(value) => setFormData({...formData, priority: value as Priority})}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(priorityConfig).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: config.color }}
                                  />
                                  {config.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>

                      {/* 预计开始日期 */}
                      <FormField label="预计开始日期">
                        <DatePicker
                          date={formData.startDate}
                          onDateChange={(date) => setFormData({...formData, startDate: date})}
                          placeholder="选择开始日期"
                          className="h-9 text-sm"
                        />
                      </FormField>

                      {/* 预期完成日期 */}
                      <FormField label="预期完成日期">
                        <DatePicker
                          date={formData.dueDate}
                          onDateChange={(date) => setFormData({...formData, dueDate: date})}
                          placeholder="选择完成日期"
                          className="h-9 text-sm"
                        />
                      </FormField>
                    </FormFieldGroup>
                  </CardContent>
                </Card>
              </div>
            </div>
        </div>
      </div>
    </AppLayout>
  );
}