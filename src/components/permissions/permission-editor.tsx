'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { adminApi, userApi } from '@/lib/api';
import { Shield, User, Save, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  roles: Role[];
}

interface PermissionEditorProps {
  onUserSelect?: (userId: string) => void;
  targetUserId?: string; // 新增：直接指定目标用户ID
}

export function PermissionEditor({ onUserSelect, targetUserId }: PermissionEditorProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 加载初始数据
  useEffect(() => {
    loadRoles();
    if (!targetUserId) {
      loadUsers();
    }
  }, [targetUserId]);

  // 当有targetUserId时，直接加载该用户的权限
  useEffect(() => {
    if (targetUserId) {
      loadUserPermissions(targetUserId);
    }
  }, [targetUserId]);

  const loadRoles = async () => {
    try {
      const response = await adminApi.getRoles();
      setRoles(response.roles || []);
    } catch (error) {
      console.error('Failed to load roles:', error);
      toast.error('加载角色列表失败');
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userApi.getUsers({ take: 100 });
      console.log('Users API response:', response); // 调试日志
      const usersList = response.users || response || [];
      setUsers(Array.isArray(usersList) ? usersList : []);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadUserPermissions = async (userId: string) => {
    try {
      setLoading(true);
      const response = await adminApi.getUserPermissions(userId);
      const user = response.user;
      setSelectedUser(user);
      setSelectedRoles(user.roles.map((role: Role) => role.name));
      if (onUserSelect) onUserSelect(userId);
    } catch (error) {
      console.error('Failed to load user permissions:', error);
      toast.error('加载用户权限失败');
    } finally {
      setLoading(false);
    }
  };

  const saveUserRoles = async () => {
    if (!selectedUser) return;
    try {
      setSaving(true);
      await adminApi.setUserRoles(selectedUser.id, selectedRoles);
      await loadUserPermissions(selectedUser.id);
      toast.success('用户权限更新成功');
    } catch (error) {
      console.error('Failed to save user roles:', error);
      toast.error('保存用户权限失败');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleToggle = (roleName: string, checked: boolean) => {
    setSelectedRoles(prev => (checked ? [...prev, roleName] : prev.filter(r => r !== roleName)));
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasChanges =
    selectedUser &&
    JSON.stringify([...selectedRoles].sort()) !== JSON.stringify(selectedUser.roles.map(r => r.name).sort());

  // 有 targetUserId 的扁平展示
  if (targetUserId) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* 当前角色（扁平展示） */}
        <div>
          <div className="text-sm text-muted-foreground mb-2">当前角色</div>
          <div className="flex flex-wrap gap-2">
            {selectedUser?.roles?.length
              ? selectedUser.roles.map(role => (
                  <Badge key={role.id} variant="secondary" className="text-xs">
                    {role.name}
                  </Badge>
                ))
              : <span className="text-sm text-muted-foreground">未分配角色</span>}
          </div>
        </div>

        {/* 角色分配（直接摊开展示） */}
        <div className="space-y-4">
          <Label className="text-base font-medium">角色分配</Label>
          <ScrollArea className="h-[300px] w-full rounded-md border p-4">
            <div className="space-y-3">
              {roles.map((role) => {
                const cnMap: Record<string, string> = {
                  'super_admin': '超级管理员',
                  'admin': '管理员',
                  'hr_manager': 'HR管理员',
                  'project_manager': '主管',
                  'member': '普通成员',
                }
                const displayName = cnMap[role.name] || role.name
                return (
                  <div key={role.id} className="flex items-start space-x-3">
                    <Checkbox
                      id={role.id}
                      checked={selectedRoles.includes(role.name)}
                      onCheckedChange={(checked) => handleRoleToggle(role.name, checked as boolean)}
                    />
                    <div className="flex-1 min-w-0">
                      <label htmlFor={role.id} className="text-sm font-medium cursor-pointer">
                        {displayName}
                        {role.isSystem && (
                          <Badge variant="outline" className="ml-2 text-xs">系统角色</Badge>
                        )}
                      </label>
                      {role.description && (
                        <p className="text-xs text-muted-foreground mt-1">{role.description}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </div>

        {/* 操作区 */}
        <div className="flex gap-2 pt-2">
          <Button onClick={saveUserRoles} disabled={!hasChanges || saving} className="flex-1">
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> 保存中...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" /> 保存权限
              </>
            )}
          </Button>
          {selectedUser && (
            <Button variant="outline" onClick={() => loadUserPermissions(selectedUser.id)} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>

        {hasChanges && (
          <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">注意：当前有未保存的权限更改</div>
        )}
      </div>
    );
  }

  // 无 targetUserId 的原有布局
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 用户选择 - 只在没有targetUserId时显示 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            选择用户
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索用户..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <ScrollArea className="h-[400px] w-full rounded-md border p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="ml-2">加载中...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedUser?.id === user.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                    }`}
                    onClick={() => loadUserPermissions(user.id)}
                  >
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                    <div className="flex gap-1 mt-2">
                      {user.roles.map((role) => (
                        <Badge key={role.id} variant="secondary" className="text-xs">
                          {role.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 权限编辑 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            权限编辑
            {selectedUser && (
              <span className="text-sm font-normal text-muted-foreground">- {selectedUser.name}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedUser ? (
            <>
              <div className="space-y-4">
                <Label className="text-base font-medium">角色分配</Label>
                <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                  <div className="space-y-3">
                    {roles.map((role) => (
                      <div key={role.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={role.id}
                          checked={selectedRoles.includes(role.name)}
                          onCheckedChange={(checked) => handleRoleToggle(role.name, checked as boolean)}
                        />
                        <div className="flex-1 min-w-0">
                          <label htmlFor={role.id} className="text-sm font-medium cursor-pointer">
                            {role.name}
                            {role.isSystem && (
                              <Badge variant="outline" className="ml-2 text-xs">系统角色</Badge>
                            )}
                          </label>
                          {role.description && (
                            <p className="text-xs text-muted-foreground mt-1">{role.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={saveUserRoles} disabled={!hasChanges || saving} className="flex-1">
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> 保存中...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" /> 保存权限
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => loadUserPermissions(selectedUser.id)} disabled={loading}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {hasChanges && (
                <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">注意：当前有未保存的权限更改</div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>请先选择一个用户进行权限编辑</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
