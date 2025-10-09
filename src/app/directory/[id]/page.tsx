'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { userApi } from '@/lib/api';
import { 
  ArrowLeft, 
  Mail,
  Phone,
  Briefcase,
  User
} from 'lucide-react';

type PublicUser = {
  id: string;
  name: string;
  email: string | null;
  username?: string;
  avatar?: string | null;
  phone: string | null;
  department?: { id: string; name: string } | null;
};

export default function DirectoryUserPage() {
  const params = useParams();
  const userId = params.id as string;
  
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载用户基本信息（仅公开字段）
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const userRes = await userApi.getUser(userId);
        const userData = userRes.user as unknown as PublicUser;
        setUser(userData);
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载失败');
        console.error('Failed to load user:', e);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadUser();
    }
  }, [userId]);

  const handleBack = () => {
    window.history.back();
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-lg">加载中...</div>
            <div className="text-sm text-muted-foreground mt-2">正在加载人员信息</div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-lg text-red-600">加载失败</div>
            <div className="text-sm text-muted-foreground mt-2">{error || '用户不存在'}</div>
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
              返回通讯录
            </Button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* 公开联系信息卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                联系信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Avatar className="h-24 w-24 mx-auto mb-4">
                  <AvatarImage 
                    src={user.avatar || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${user.username || user.email || user.name}`} 
                  />
                  <AvatarFallback className="text-2xl">{user.name[0]}</AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-semibold mb-2">{user.name}</h2>
              </div>

              <div className="space-y-3">
                {/* 手机号 */}
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">手机号码</span>
                  <span>{user.phone || <span className="text-muted-foreground">-</span>}</span>
                </div>

                {/* 邮箱 */}
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">邮箱</span>
                  <span>{user.email || <span className="text-muted-foreground">-</span>}</span>
                </div>

                {/* 部门 */}
                <div className="flex items-center gap-3 text-sm">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">部门</span>
                  <span>{user.department?.name || <span className="text-muted-foreground">未分配</span>}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}


