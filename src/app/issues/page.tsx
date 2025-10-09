'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { issueApi } from '@/lib/api';
import type { Issue, IssueStatus } from '@/types/issue';

import {
  Table,
  TableHeader as TableHeaderRaw,
  TableBody as TableBodyRaw,
  TableRow as TableRowRaw,
  TableCell as TableCellRaw,
  TableHead as TableHeadRaw,
} from '@/components/ui/table';

import Link from 'next/link';

import { Search, Plus, Eye } from 'lucide-react';

// Issue类型配置
const issueTypeConfig = {
  FEATURE: { label: '新功能' },
  ENHANCEMENT: { label: '功能增强' },
  BUG_FIX: { label: 'Bug修复' },
  TECHNICAL_DEBT: { label: '技术债务' },
  RESEARCH: { label: '技术调研' },
};

// 优先级标签
const priorityConfig = {
  LOW: { label: '低', color: 'bg-gray-100 text-gray-800' },
  MEDIUM: { label: '中', color: 'bg-yellow-100 text-yellow-800' },
  HIGH: { label: '高', color: 'bg-orange-100 text-orange-800' },
  URGENT: { label: '紧急', color: 'bg-red-100 text-red-800' },
};

// 输入源标签
const inputSourceConfig = {
  USER_FEEDBACK: { label: '用户反馈' },
  INTERNAL: { label: '内部反馈' },
  DATA_ANALYSIS: { label: '数据分析' },
  STRATEGY: { label: '战略需求' },
};

// 状态配置 - 简化为四类
const getSimplifiedStatus = (status: IssueStatus) => {
  switch (status) {
    case 'OPEN':
    case 'IN_DISCUSSION':
      return { label: '待开始', color: 'bg-gray-100 text-gray-800' };
    case 'APPROVED':
    case 'IN_PRD':
    case 'IN_DEVELOPMENT':
      return { label: '进行中', color: 'bg-blue-100 text-blue-800' };
    case 'IN_TESTING':
    case 'IN_ACCEPTANCE':
      return { label: '审核中', color: 'bg-yellow-100 text-yellow-800' };
    case 'COMPLETED':
      return { label: '已完成', color: 'bg-green-100 text-green-800' };
    case 'REJECTED':
    case 'CANCELLED':
      return { label: '已完成', color: 'bg-gray-100 text-gray-800' };
    default:
      return { label: '待开始', color: 'bg-gray-100 text-gray-800' };
  }
};

// 使用真实的Issue类型定义已在types/issue.ts中

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载Issues数据
  useEffect(() => {
    const loadIssues = async () => {
      try {
        setLoading(true);
        const response = await issueApi.getIssues();
        setIssues(response.issues.issues);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
        console.error('Failed to load issues:', err);
      } finally {
        setLoading(false);
      }
    };

    loadIssues();
  }, []);

  // 过滤Issues
  const filteredIssues = issues.filter(issue =>
    issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* 页面标题已移至顶部导航栏 */}

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
          <Button asChild>
            <Link href="/issues/new">
              <Plus className="h-4 w-4 mr-2" />
              创建Issue
            </Link>
          </Button>
        </div>


        {/* Issues表格 */}
        <div className="rounded-md border overflow-x-auto">
          <Table className="min-w-full">
            <TableHeaderRaw>
              <TableRowRaw>
                <TableHeadRaw>标题</TableHeadRaw>
                <TableHeadRaw>类型</TableHeadRaw>
                <TableHeadRaw>优先级</TableHeadRaw>
                <TableHeadRaw>状态</TableHeadRaw>
                <TableHeadRaw>负责人</TableHeadRaw>
                <TableHeadRaw>输入源</TableHeadRaw>
                <TableHeadRaw>创建时间</TableHeadRaw>
                <TableHeadRaw>操作</TableHeadRaw>
              </TableRowRaw>
            </TableHeaderRaw>
            <TableBodyRaw>
              {loading ? (
                <TableRowRaw>
                  <TableCellRaw colSpan={9} className="h-24 text-center">
                    加载中...
                  </TableCellRaw>
                </TableRowRaw>
              ) : error ? (
                <TableRowRaw>
                  <TableCellRaw colSpan={9} className="h-24 text-center text-red-600">
                    {error}
                  </TableCellRaw>
                </TableRowRaw>
              ) : filteredIssues.length > 0 ? (
                filteredIssues.map((issue) => (
                  <TableRowRaw key={issue.id}>
                    <TableCellRaw>
                      <div className="max-w-md">
                        <div className="font-medium">{issue.title}</div>
                      </div>
                    </TableCellRaw>
                    <TableCellRaw>
                      <Badge variant="outline">
                        {issueTypeConfig[issue.issueType]?.label}
                      </Badge>
                    </TableCellRaw>
                    <TableCellRaw>
                      <Badge variant="outline" className={priorityConfig[issue.priority]?.color}>
                        {priorityConfig[issue.priority]?.label}
                      </Badge>
                    </TableCellRaw>
                    <TableCellRaw>
                      <Badge variant="outline" className={getSimplifiedStatus(issue.status).color}>
                        {getSimplifiedStatus(issue.status).label}
                      </Badge>
                    </TableCellRaw>
                    <TableCellRaw>
                      <div className="flex items-center gap-2">
                        {issue.assignee ? (
                          <>
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={`https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${issue.assignee.username}`} />
                              <AvatarFallback>{issue.assignee.name[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{issue.assignee.name}</span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">未分配</span>
                        )}
                      </div>
                    </TableCellRaw>
                    <TableCellRaw>
                      <Badge variant="outline">
                        {inputSourceConfig[issue.inputSource]?.label}
                      </Badge>
                    </TableCellRaw>
                    <TableCellRaw className="text-sm">
                      {new Date(issue.createdAt).toLocaleDateString('zh-CN')}
                    </TableCellRaw>
                    <TableCellRaw>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/issues/${issue.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          详情
                        </Link>
                      </Button>
                    </TableCellRaw>
                  </TableRowRaw>
                ))
              ) : (
                <TableRowRaw>
                  <TableCellRaw colSpan={8} className="h-24 text-center">
                    暂无Issues数据
                  </TableCellRaw>
                </TableRowRaw>
              )}
            </TableBodyRaw>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
