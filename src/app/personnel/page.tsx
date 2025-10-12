'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AppLayout } from '@/components/layout/app-layout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { userApi, adminApi } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  phone?: string;
  avatar?: string;
  department?: {
    id: string;
    name: string;
  };
  roles?: Array<{
    id: string;
    name: string;
  }>;
}

interface Department {
  id: string;
  name: string;
}

export default function PersonnelManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBusinessUnit, setSelectedBusinessUnit] = useState<string>(''); // 事业部筛选
  const [selectedDepartment, setSelectedDepartment] = useState<string>(''); // 部门筛选
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 并发加载用户和部门数据
      const [usersRes, departmentsRes] = await Promise.all([
        userApi.getUsers({ take: 1000 }),
        adminApi.departments()
      ]);
      
      setUsers(usersRes.users?.users || []);
      
      // 保留所有部门数据（包括事业部和部门）用于筛选
      setDepartments((departmentsRes.departments || []) as Department[]);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 获取所有事业部（parentId为null且有子部门的部门）
  const businessUnits = departments.filter(d => {
    if (d.parentId) return false;
    // 检查是否有子部门
    return departments.some(child => child.parentId === d.id);
  });
  
  // 根据选中的事业部，获取其下的部门（叶子部门）
  const getFilteredDepartments = () => {
    if (!selectedBusinessUnit) return [];
    
    // 找出该事业部下的所有部门（递归查找所有子孙部门）
    const getAllChildDepts = (parentId: string): Department[] => {
      const children = departments.filter(d => d.parentId === parentId);
      const allDescendants: Department[] = [...children];
      children.forEach(child => {
        allDescendants.push(...getAllChildDepts(child.id));
      });
      return allDescendants;
    };
    
    const allChildDepts = getAllChildDepts(selectedBusinessUnit);
    
    // 只返回叶子部门（没有子部门的部门）
    const childIds = new Set(allChildDepts.map(d => d.id));
    return allChildDepts.filter(d => !allChildDepts.some(child => child.parentId === d.id));
  };
  
  const filteredDepartments = getFilteredDepartments();

  const filteredUsers = users.filter(user => {
    // 文本搜索过滤（姓名/手机号/部门）
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      user.name.toLowerCase().includes(q) ||
      (user.phone ? String(user.phone).toLowerCase().includes(q) : false) ||
      (user.department?.name ? user.department.name.toLowerCase().includes(q) : false);
    
    // 事业部筛选
    let matchesBusinessUnit = true;
    if (selectedBusinessUnit && selectedBusinessUnit !== 'all') {
      if (selectedBusinessUnit === 'unassigned') {
        matchesBusinessUnit = !user.department;
      } else if (user.department?.id) {
        // 检查用户所在部门是否属于选中的事业部（递归检查父级）
        const isUnderBusinessUnit = (deptId: string): boolean => {
          if (deptId === selectedBusinessUnit) return true;
          const dept = departments.find(d => d.id === deptId);
          if (!dept || !dept.parentId) return false;
          return isUnderBusinessUnit(dept.parentId);
        };
        matchesBusinessUnit = isUnderBusinessUnit(user.department.id);
      } else {
        matchesBusinessUnit = false;
      }
    }
    
    // 部门筛选
    const matchesDepartment = !selectedDepartment || selectedDepartment === 'all' ||
      (selectedDepartment === 'unassigned' ? !user.department : user.department?.id === selectedDepartment);
    
    return matchesSearch && matchesBusinessUnit && matchesDepartment;
  });


  // 下载CSV模板
  const downloadCSVTemplate = () => {
    const csv = '姓名,邮箱,部门,手机,员工编码\n张三,zhangsan@example.com,产品部,13800000000,EMP001\n李四,lisi@example.com,测试部,13900000000,EMP002';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; 
    a.download = '人员导入模板.csv'; 
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">加载人员信息...</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Search and Filter */}
        <div className="flex items-center gap-4 justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索人员姓名、手机号或部门..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-96 bg-background border-border focus:ring-2 focus:ring-primary/20"
            />
          </div>
          
          {/* 事业部筛选 */}
          <Select value={selectedBusinessUnit} onValueChange={(v) => {
            setSelectedBusinessUnit(v);
            setSelectedDepartment(''); // 切换事业部时清空部门选择
          }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="筛选事业部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部事业部</SelectItem>
              <SelectItem value="unassigned">未分配</SelectItem>
              {businessUnits.map((bu) => (
                <SelectItem key={bu.id} value={bu.id}>
                  {bu.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* 部门筛选（级联） */}
          <Select 
            value={selectedDepartment} 
            onValueChange={setSelectedDepartment}
            disabled={!selectedBusinessUnit || selectedBusinessUnit === 'all' || selectedBusinessUnit === 'unassigned'}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="筛选部门" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部部门</SelectItem>
              {filteredDepartments.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" onClick={()=>{ window.location.href='/admin/fields'; }}>
              字段配置
            </Button>
            <Button variant="outline" onClick={()=>{ window.location.href='/admin/permissions'; }}>
              权限管理
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              导入人员
            </Button>
            <Link href="/personnel/new">
              <Button>
                添加人员
              </Button>
            </Link>
          </div>
        </div>

        {/* Users Table */}
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>手机号</TableHead>
                  <TableHead>部门</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${user.username || user.email || user.name}` } />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.phone || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {user.department ? user.department.name : <span className="text-muted-foreground">未分配</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/personnel/${user.id}`)}
                        >
                          查看
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/personnel/${user.id}/edit`)}
                        >
                          编辑
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? '未找到匹配的人员' : '暂无人员数据'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 导入人员对话框 */}
        <Dialog open={importOpen} onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) {
            setImportText('');
          }
        }}>
          <DialogContent className="w-[640px] max-w-[90vw] max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <DialogHeader>
              <DialogTitle>导入人员</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  支持上传 CSV 文件。表头应包含：姓名，且邮箱或手机至少一项（可选：部门、员工编码）
                </p>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async ()=>{
                      try {
                        const res = await userApi.userImportHeaders();
                        const headers: string[] = res?.userImportHeaders || ['姓名','邮箱','部门','手机','员工编码'];
                        const csv = headers.join(',') + '\n';
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = '人员导入模板.csv'; a.click();
                        URL.revokeObjectURL(url);
                      } catch {
                        downloadCSVTemplate();
                      }
                    }}
                  >
                    下载CSV模板
                  </Button>
                </div>

                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      const text = await file.text();
                      setImportText(text);
                    }}
                    className="hidden"
                  />
                  <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                      CSV
                    </div>
                    <div className="mt-4">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        选择CSV文件
                      </Button>
                      <p className="mt-2 text-sm text-muted-foreground">
                        仅支持.csv格式文件
                      </p>
                    </div>
                  </div>
                </div>

                {importText && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">预览数据：</p>
                    <div className="bg-muted p-3 rounded text-xs max-h-32 overflow-y-auto overflow-x-hidden">
                      <pre className="whitespace-pre-wrap break-all">
                        {importText.slice(0, 500)}{importText.length > 500 ? '...' : ''}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setImportOpen(false)}>
                取消
              </Button>
              <Button 
                disabled={importing || !importText.trim()} 
                onClick={async () => {
                  try {
                    setImporting(true);
                    const res = await userApi.importUsers(importText);
                    const info: { created: number; skipped: number; errors: string[] } = res.importUsers;
                    await loadData();
                    setImportOpen(false);
                    setImportText('');
                    if (info.errors?.length) {
                      toast.message(`导入完成：新增 ${info.created} 条，跳过 ${info.skipped} 条`, { description: info.errors.join('\n') });
                    } else {
                      toast.success(`导入完成：新增 ${info.created} 条，跳过 ${info.skipped} 条`);
                    }
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : String(e);
                    toast.error('导入失败：' + msg);
                  } finally {
                    setImporting(false);
                  }
                }}
              >
                {importing ? '导入中...' : '确定导入'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}