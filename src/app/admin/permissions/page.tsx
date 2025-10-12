'use client';

import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { adminApi, userApi } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Search, Pencil, X, InfoIcon } from 'lucide-react';

// 角色中文映射
const ROLE_CN_MAP: Record<string, string> = {
  'super_admin': '超级管理员',
  'admin': '管理员',
  'hr_manager': 'HR管理员',
  'project_manager': '主管',
  'member': '普通成员',
};

// 角色说明
const ROLE_DESCRIPTIONS: Record<string, string> = {
  'super_admin': '拥有系统所有权限，可管理所有用户和数据',
  'admin': '可管理用户、部门、项目等，但不能修改系统配置',
  'hr_manager': '可查看和管理人员信息，包括保密字段',
  'project_manager': '可管理项目和团队，查看项目成员信息',
  'member': '普通成员，只能查看公开信息和编辑自己的资料',
};

export default function PermissionsHome() {
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; roles: { id: string; name: string }[] }>>([]);
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const load = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        userApi.getUsers({ take: 1000 }),
        adminApi.getRoles(),
      ]);
      const list = (usersRes.users?.users || []) as Array<{ id: string; name: string; email: string; roles: { id: string; name: string }[] }>;
      setUsers(list);
      setRoles((rolesRes.roles || []) as Array<{ id: string; name: string }>);
    } catch (e) {
      console.error(e);
      toast.error('加载数据失败');
    }
  };

  useEffect(() => { load(); }, []);

  const adminRoleNames = new Set(['super_admin','admin','hr_manager','project_manager']);
  const adminUsers = users.filter(u => (u.roles || []).some(r => adminRoleNames.has(r.name)));

  const handleSelectUser = async (userId: string) => {
    setSelectedUserId(userId);
    try {
      const res = await adminApi.getUserPermissions(userId);
      const current = (res?.user?.roles || []).map((r: { name: string }) => r.name);
      setSelectedRoles(current);
    } catch {
      setSelectedRoles([]);
    }
  };

  const toggleRole = (name: string) => {
    setSelectedRoles(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const save = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    try {
      await adminApi.setUserRoles(selectedUserId, selectedRoles);
      toast.success('已更新角色');
      await load();
      // 保存成功后清空选择
      setSelectedUserId('');
      setSelectedRoles([]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('保存失败：' + msg);
    } finally {
      setSaving(false);
    }
  };
  
  // 移除用户的某个角色
  const removeRole = async (userId: string, roleName: string) => {
    if (!window.confirm(`确认移除角色"${ROLE_CN_MAP[roleName] || roleName}"？`)) {
      return;
    }
    
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;
      
      const newRoles = user.roles.filter(r => r.name !== roleName).map(r => r.name);
      await adminApi.setUserRoles(userId, newRoles);
      toast.success('已移除角色');
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('移除失败：' + msg);
    }
  };

  // 过滤用户列表
  const filteredUsers = users.filter(u => {
    const term = searchTerm.toLowerCase();
    return u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">权限管理</h2>

        {/* 搜索人员 */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索人员姓名或邮箱..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* 搜索结果列表或选中人员权限编辑 */}
        {!selectedUserId && searchTerm && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">搜索结果：{filteredUsers.length} 人</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>当前角色（点击 × 移除）</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(u => {
                  const userRoles = u.roles || [];
                  return (
                    <TableRow key={u.id}>
                      <TableCell>{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {userRoles.length === 0 ? (
                            <span className="text-muted-foreground text-sm">无角色</span>
                          ) : (
                            userRoles.map(role => (
                              <Badge 
                                key={role.id} 
                                variant="secondary"
                                className="gap-1 pr-1"
                              >
                                <span>{ROLE_CN_MAP[role.name] || role.name}</span>
                                <button
                                  onClick={() => removeRole(u.id, role.name)}
                                  className="ml-1 rounded-full hover:bg-muted p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 px-2"
                            onClick={() => handleSelectUser(u.id)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {selectedUserId && (
          <div className="space-y-4 border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-medium">
                  编辑：{users.find(u => u.id === selectedUserId)?.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {users.find(u => u.id === selectedUserId)?.email}
                </div>
              </div>
              <Button variant="outline" onClick={() => {
                setSelectedUserId('');
                setSelectedRoles([]);
              }}>
                取消
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">勾选下列角色以赋予权限（可多选）</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {roles.map(role => {
                const displayName = ROLE_CN_MAP[role.name] || role.name;
                const description = ROLE_DESCRIPTIONS[role.name] || '';
                return (
                  <label 
                    key={role.id} 
                    className="flex flex-col gap-2 border rounded-md p-3 cursor-pointer hover:bg-muted/50"
                    title={description}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedRoles.includes(role.name)}
                        onCheckedChange={() => toggleRole(role.name)}
                      />
                      <span className="font-medium">{displayName}</span>
                    </div>
                    {description && (
                      <div className="text-xs text-muted-foreground pl-6">
                        {description}
                      </div>
                    )}
                  </label>
                )
              })}
            </div>
            
            <div className="flex items-center gap-2">
              <Button disabled={saving} onClick={save}>
                {saving ? '保存中...' : '保存修改'}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">管理员列表</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <InfoIcon className="h-4 w-4" />
              <span>点击角色标签的 × 可快速移除</span>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>角色</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminUsers.map(u => {
                const userRoles = u.roles || [];
                return (
                  <TableRow key={u.id}>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {userRoles.map(role => (
                          <Badge 
                            key={role.id} 
                            variant="secondary"
                            className="gap-1 pr-1"
                            title={ROLE_DESCRIPTIONS[role.name] || ''}
                          >
                            <span>{ROLE_CN_MAP[role.name] || role.name}</span>
                            <button
                              onClick={() => removeRole(u.id, role.name)}
                              className="ml-1 rounded-full hover:bg-muted p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 px-2"
                          onClick={() => handleSelectUser(u.id)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}


