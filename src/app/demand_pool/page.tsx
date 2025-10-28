'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ListFilter } from 'lucide-react';
import { nanoid } from 'nanoid';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import Filters, { FilterType, FilterOperator } from '@/components/ui/filters';
import { issueApi, userApi } from '@/lib/api';
import type { Issue } from '@/types/issue';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Eye, FileText } from 'lucide-react';

// 优先级配置
const priorityConfig = {
  LOW: { label: '低', color: 'bg-gray-100 text-gray-800' },
  MEDIUM: { label: '中', color: 'bg-yellow-100 text-yellow-800' },
  HIGH: { label: '高', color: 'bg-orange-100 text-orange-800' },
  URGENT: { label: '紧急', color: 'bg-red-100 text-red-800' },
};

// GitLab 状态类型
type GitLabStateFilter = 'opened' | 'closed' | 'all';

// Filter类型定义（需要匹配Filters组件的Filter接口）
interface Filter {
  id: string;
  type: FilterType;
  value: string[];
  operator: FilterOperator;
}

export default function DemandPoolPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // GitLab 状态筛选
  const [gitlabStateFilter, setGitlabStateFilter] = useState<GitLabStateFilter>('opened');
  
  // Filters组件状态
  const [filters, setFilters] = useState<Filter[]>([]);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [selectedFilterView, setSelectedFilterView] = useState<FilterType | null>(null);
  const [commandInput, setCommandInput] = useState('');
  const commandInputRef = React.useRef<HTMLInputElement>(null);
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // 评审对话框状态
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [approvalComment, setApprovalComment] = useState<string>('');
  const [level2Approver, setLevel2Approver] = useState<string | undefined>(undefined);
  const [level3Approver, setLevel3Approver] = useState<string | undefined>(undefined);
  const [approvers, setApprovers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [approving, setApproving] = useState(false);

  // 加载Issues数据 - 加载所有GitLab同步的Issue
  const loadIssues = async () => {
    try {
      setLoading(true);
      setError(null);
      // 传入大的take值以获取所有数据
      const response = await issueApi.getIssues({}, { take: 1000 });
      console.log('加载的Issue数量:', response.issues.issues.length);
      setIssues(response.issues.issues);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
      console.error('Failed to load issues:', err);
    } finally {
      setLoading(false);
    }
  };

  // 加载审批人列表
  const loadApprovers = async () => {
      try {
      const response = await userApi.getUsers({});
      const filteredUsers = (response.users.users || []).slice(0, 10);
      setApprovers(filteredUsers);
      } catch (err) {
      console.error('Failed to load approvers:', err);
      }
    };

  // 初始加载数据
  useEffect(() => {
    loadIssues();
    loadApprovers();
  }, []);

  // 打开评审对话框
  const openApproveDialog = (issue: Issue) => {
    setSelectedIssue(issue);
    setSelectedVersion('');
    setApprovalComment('');
    setLevel2Approver(undefined);
    setLevel3Approver(undefined);
    setApproveDialogOpen(true);
  };

  // 关闭评审对话框
  const closeApproveDialog = () => {
    setApproveDialogOpen(false);
    setSelectedIssue(null);
    setSelectedVersion('');
    setApprovalComment('');
    setLevel2Approver(undefined);
    setLevel3Approver(undefined);
  };

  // 执行评审
  const handleApproveIssue = async () => {
    if (!selectedIssue || !selectedVersion || !approvalComment) {
      alert('请填写版本号和评审意见');
      return;
    }

    try {
      setApproving(true);
      
      console.log('一级评审提交:', {
        issueId: selectedIssue.id,
        version: selectedVersion,
        comment: approvalComment,
        level: 1,
        level2Approver: level2Approver || '默认二级审批人',
        level3Approver: level3Approver || '默认三级审批人',
      });
      
      // TODO: 调用新的评审API
      // await issueApi.createIssueApproval(...)
      
      loadIssues();
      closeApproveDialog();
      alert('一级评审提交成功，已进入预排期');
    } catch (err) {
      console.error('Failed to approve issue:', err);
      alert(`评审失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setApproving(false);
    }
  };

  // 过滤Issues
  const filteredIssues = issues.filter(issue => {
    // 1. GitLab 状态过滤
    if (gitlabStateFilter !== 'all') {
      if (issue.gitlabState !== gitlabStateFilter) {
        return false;
      }
    }
    
    // 2. Filters组件过滤
    for (const filter of filters) {
      if (!filter.value || filter.value.length === 0) continue;
      
      switch (filter.type) {
        case FilterType.PRIORITY:
          if (!filter.value.includes(issue.priority)) return false;
          break;
        case FilterType.LABELS:
          // 类型筛选 - 基于C:标签
          const type = getTypeFromLabels(issue.gitlabLabels);
          if (!filter.value.includes(type)) return false;
          break;
        case FilterType.ASSIGNEE:
          // 提交人筛选
          if (!filter.value.includes(issue.creator.id)) return false;
          break;
      }
    }
    
    return true;
  });

  // 分页处理
  const totalPages = Math.ceil(filteredIssues.length / itemsPerPage);
  const paginatedIssues = filteredIssues.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 从GitLab标签提取类型信息
  const getTypeFromLabels = (labels: string[] | undefined) => {
    if (!labels) return '-';
    const cLabel = labels.find(label => label.startsWith('C:'));
    if (cLabel) {
      return cLabel.replace('C:', '').trim();
    }
    return '-';
  };

  // 统计数据
  const openedCount = issues.filter(i => i.gitlabState === 'opened').length;
  const closedCount = issues.filter(i => i.gitlabState === 'closed').length;
  const allCount = issues.length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* GitLab 状态切换栏 + Filters */}
        <div className="flex items-center gap-6">
          {/* 状态Tab */}
          <div className="flex items-center gap-2">
            <Button
              variant={gitlabStateFilter === 'opened' ? 'default' : 'outline'}
              onClick={() => {
                setGitlabStateFilter('opened');
                setCurrentPage(1);
              }}
              className="flex items-center gap-2"
            >
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              开放中
              <Badge variant="secondary" className="ml-1">{openedCount}</Badge>
            </Button>
            
            <Button
              variant={gitlabStateFilter === 'closed' ? 'default' : 'outline'}
              onClick={() => {
                setGitlabStateFilter('closed');
                setCurrentPage(1);
              }}
              className="flex items-center gap-2"
            >
              <div className="h-2 w-2 rounded-full bg-gray-400"></div>
              已关闭
              <Badge variant="secondary" className="ml-1">{closedCount}</Badge>
            </Button>
            
            <Button
              variant={gitlabStateFilter === 'all' ? 'default' : 'outline'}
              onClick={() => {
                setGitlabStateFilter('all');
                setCurrentPage(1);
              }}
              className="flex items-center gap-2"
            >
              全部
              <Badge variant="secondary" className="ml-1">{allCount}</Badge>
            </Button>
          </div>

          {/* Filters组件 */}
          <div className="flex gap-2 flex-wrap items-center">
            <Filters filters={filters} setFilters={setFilters} />
            
            {/* Clear筛选按钮 */}
            {filters.filter((filter) => filter.value?.length > 0).length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="transition group h-6 text-xs items-center rounded-sm"
                onClick={() => setFilters([])}
              >
                清空
              </Button>
            )}
            
            {/* 添加筛选器Popover */}
            <Popover
              open={filterPopoverOpen}
              onOpenChange={(open) => {
                setFilterPopoverOpen(open);
                if (!open) {
                  setTimeout(() => {
                    setSelectedFilterView(null);
                    setCommandInput('');
                  }, 200);
                }
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  role="combobox"
                  aria-expanded={filterPopoverOpen}
                  size="sm"
                  className={cn(
                    "transition group h-6 text-xs items-center rounded-sm flex gap-1.5",
                    filters.length > 0 && "w-6"
                  )}
                >
                  <ListFilter className="size-3 shrink-0 transition-all text-muted-foreground group-hover:text-primary" />
                  {!filters.length && "筛选"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput
                    placeholder={selectedFilterView ? selectedFilterView : "筛选..."}
                    className="h-9"
                    value={commandInput}
                    onInput={(e) => setCommandInput(e.currentTarget.value)}
                    ref={commandInputRef}
                  />
                  <CommandList>
                    <CommandEmpty>未找到结果</CommandEmpty>
                    {selectedFilterView ? (
                      <CommandGroup>
                        {/* 根据选择的筛选类型显示选项 */}
                        {selectedFilterView === FilterType.PRIORITY && (
                          <>
                            <CommandItem
                              onSelect={() => {
                                setFilters([...filters, {
                                  id: nanoid(),
                                  type: FilterType.PRIORITY,
                                  operator: FilterOperator.IS,
                                  value: ['HIGH'],
                                }]);
                                setFilterPopoverOpen(false);
                                setTimeout(() => {
                                  setSelectedFilterView(null);
                                  setCommandInput('');
                                }, 200);
                              }}
                            >
                              高
                            </CommandItem>
                            <CommandItem
                              onSelect={() => {
                                setFilters([...filters, {
                                  id: nanoid(),
                                  type: FilterType.PRIORITY,
                                  operator: FilterOperator.IS,
                                  value: ['MEDIUM'],
                                }]);
                                setFilterPopoverOpen(false);
                                setTimeout(() => {
                                  setSelectedFilterView(null);
                                  setCommandInput('');
                                }, 200);
                              }}
                            >
                              中
                            </CommandItem>
                            <CommandItem
                              onSelect={() => {
                                setFilters([...filters, {
                                  id: nanoid(),
                                  type: FilterType.PRIORITY,
                                  operator: FilterOperator.IS,
                                  value: ['LOW'],
                                }]);
                                setFilterPopoverOpen(false);
                                setTimeout(() => {
                                  setSelectedFilterView(null);
                                  setCommandInput('');
                                }, 200);
                              }}
                            >
                              低
                            </CommandItem>
                          </>
                        )}
                        {selectedFilterView === FilterType.LABELS && (
                          <CommandItem
                            onSelect={() => {
                              setFilters([...filters, {
                                id: nanoid(),
                                type: FilterType.LABELS,
                                operator: FilterOperator.IS,
                                value: [],
                              }]);
                              setFilterPopoverOpen(false);
                              setTimeout(() => {
                                setSelectedFilterView(null);
                                setCommandInput('');
                              }, 200);
                            }}
                          >
                            添加标签筛选
                          </CommandItem>
                        )}
                        {selectedFilterView === FilterType.ASSIGNEE && (
                          <CommandItem
                            onSelect={() => {
                              setFilters([...filters, {
                                id: nanoid(),
                                type: FilterType.ASSIGNEE,
                                operator: FilterOperator.IS,
                                value: [],
                              }]);
                              setFilterPopoverOpen(false);
                              setTimeout(() => {
                                setSelectedFilterView(null);
                                setCommandInput('');
                              }, 200);
                            }}
                          >
                            添加提交人筛选
                          </CommandItem>
                        )}
                      </CommandGroup>
                    ) : (
                      <CommandGroup>
                        {!filters.find(f => f.type === FilterType.PRIORITY) && (
                          <CommandItem
                            className="group text-muted-foreground flex gap-2 items-center"
                            onSelect={() => {
                              setSelectedFilterView(FilterType.PRIORITY);
                              setCommandInput('');
                              commandInputRef.current?.focus();
                            }}
                          >
                            <span className="text-accent-foreground">优先级</span>
                          </CommandItem>
                        )}
                        {!filters.find(f => f.type === FilterType.LABELS) && (
                          <CommandItem
                            className="group text-muted-foreground flex gap-2 items-center"
                            onSelect={() => {
                              setSelectedFilterView(FilterType.LABELS);
                              setCommandInput('');
                              commandInputRef.current?.focus();
                            }}
                          >
                            <span className="text-accent-foreground">类型</span>
                          </CommandItem>
                        )}
                        {!filters.find(f => f.type === FilterType.ASSIGNEE) && (
                          <CommandItem
                            className="group text-muted-foreground flex gap-2 items-center"
                            onSelect={() => {
                              setSelectedFilterView(FilterType.ASSIGNEE);
                              setCommandInput('');
                              commandInputRef.current?.focus();
                            }}
                          >
                            <span className="text-accent-foreground">提交人</span>
                          </CommandItem>
                        )}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* 结果统计 */}
        <div className="text-sm text-muted-foreground">
          共 {filteredIssues.length} 条结果
          {filteredIssues.length !== issues.length && ` （从 ${issues.length} 条中筛选）`}
        </div>

        {/* 列表视图 */}
        <div className="space-y-4">
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-full">
              <TableHeaderRaw>
                <TableRowRaw>
                  <TableHeadRaw className="w-[25%]">标题</TableHeadRaw>
                  <TableHeadRaw>类型</TableHeadRaw>
                  <TableHeadRaw>优先级</TableHeadRaw>
                  <TableHeadRaw>提交人</TableHeadRaw>
                  <TableHeadRaw>更新时间</TableHeadRaw>
                  <TableHeadRaw>排期状态</TableHeadRaw>
                  <TableHeadRaw>审核状态</TableHeadRaw>
                  <TableHeadRaw className="text-right">操作</TableHeadRaw>
                </TableRowRaw>
              </TableHeaderRaw>
              <TableBodyRaw>
                {loading ? (
                  <TableRowRaw>
                    <TableCellRaw colSpan={8} className="h-24 text-center">
                      加载中...
                    </TableCellRaw>
                  </TableRowRaw>
                ) : error ? (
                  <TableRowRaw>
                    <TableCellRaw colSpan={8} className="h-24 text-center text-red-600">
                      {error}
                    </TableCellRaw>
                  </TableRowRaw>
                ) : paginatedIssues.length > 0 ? (
                  paginatedIssues.map((issue) => (
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
                        <span className="text-sm">
                          {getTypeFromLabels(issue.gitlabLabels)}
                        </span>
                      </TableCellRaw>
                      <TableCellRaw>
                        <Badge variant="outline" className={priorityConfig[issue.priority]?.color}>
                          {priorityConfig[issue.priority]?.label}
                        </Badge>
                      </TableCellRaw>
                      <TableCellRaw>
                        <div className="flex items-center gap-2">
                          {issue.creator ? (
                            <>
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={`https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${issue.creator.username}`} />
                                <AvatarFallback>{issue.creator.name?.[0] || 'U'}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm truncate max-w-[100px]" title={issue.creator.name}>
                                {issue.creator.name}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">未知</span>
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
                        <Badge variant={issue.stage === 'SCHEDULED' ? 'default' : 'secondary'} className="text-xs">
                          {issue.stage === 'FEEDBACK' ? '未排期' : issue.stage === 'SCHEDULED' ? '预排期' : '未排期'}
                        </Badge>
                      </TableCellRaw>
                      <TableCellRaw>
                        <Badge variant="outline" className="text-xs">
                          {/* TODO: 从评审历史获取审核状态 */}
                          未评审
                        </Badge>
                      </TableCellRaw>
                      <TableCellRaw>
                        <div className="flex items-center justify-end gap-2">
                          {gitlabStateFilter === 'opened' && (
                          <Button
                            variant="default"
                            size="sm"
                              onClick={() => openApproveDialog(issue)}
                          >
                              <FileText className="h-4 w-4 mr-1" />
                            评审
                          </Button>
                          )}
                          
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
                    <TableCellRaw colSpan={8} className="h-24 text-center">
                      暂无数据
                    </TableCellRaw>
                  </TableRowRaw>
                )}
              </TableBodyRaw>
            </Table>
          </div>

          {/* 分页组件 */}
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) setCurrentPage(currentPage - 1);
                    }}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                
                {currentPage > 2 && (
                  <PaginationItem>
                    <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(1); }}>
                      1
                    </PaginationLink>
                  </PaginationItem>
                )}
                
                {currentPage > 3 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                
                {currentPage > 1 && (
                  <PaginationItem>
                    <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(currentPage - 1); }}>
                      {currentPage - 1}
                    </PaginationLink>
                  </PaginationItem>
                )}
                
                <PaginationItem>
                  <PaginationLink href="#" isActive>
                    {currentPage}
                  </PaginationLink>
                </PaginationItem>
                
                {currentPage < totalPages && (
                  <PaginationItem>
                    <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(currentPage + 1); }}>
                      {currentPage + 1}
                    </PaginationLink>
                  </PaginationItem>
                )}
                
                {currentPage < totalPages - 2 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                
                {currentPage < totalPages - 1 && (
                  <PaginationItem>
                    <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(totalPages); }}>
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                )}
                
                <PaginationItem>
                  <PaginationNext 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                    }}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>

      {/* 评审对话框 */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>需求评审 - {selectedIssue?.title}</DialogTitle>
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

            {/* 二级审批人 */}
            <div className="space-y-2">
              <Label htmlFor="level2Approver">二级审批人（可选）</Label>
              <Select value={level2Approver} onValueChange={(value) => setLevel2Approver(value || undefined)}>
                <SelectTrigger id="level2Approver">
                  <SelectValue placeholder="使用默认" />
                </SelectTrigger>
                <SelectContent>
                  {approvers.map((approver) => (
                    <SelectItem key={approver.id} value={approver.id}>
                      {approver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                留空则使用默认二级审批人
              </p>
            </div>

            {/* 三级审批人 */}
            <div className="space-y-2">
              <Label htmlFor="level3Approver">三级审批人（可选）</Label>
              <Select value={level3Approver} onValueChange={(value) => setLevel3Approver(value || undefined)}>
                <SelectTrigger id="level3Approver">
                  <SelectValue placeholder="使用默认" />
              </SelectTrigger>
              <SelectContent>
                  {approvers.map((approver) => (
                    <SelectItem key={approver.id} value={approver.id}>
                      {approver.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
              <p className="text-xs text-muted-foreground">
                留空则使用默认三级审批人
              </p>
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
              disabled={approving || !selectedVersion || !approvalComment}
            >
              {approving ? '提交中...' : '提交评审'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
