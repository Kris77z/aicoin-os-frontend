'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { userApi, visibilityApi, adminApi, authApi } from '@/lib/api';
import Link from 'next/link';
import { toast } from 'sonner';

import { 
  ArrowLeft, 
  Edit,
  Phone,
  Briefcase,
  EyeOff,
  User,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Landmark,
  Users,
  FileText,
  CreditCard,
  Paperclip
} from 'lucide-react';

const maskValue = (value: string | null | undefined, visible: boolean): string => {
  if (!value) return '';
  if (visible) return value;
  if (value.length <= 3) return '***';
  if (value.length <= 6) return '****';
  return '******';
};

type DetailUser = {
  id: string;
  name: string;
  email: string | null;
  username: string;
  avatar?: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  department?: { id: string; name: string } | null;
  fieldValues?: Array<{
    fieldKey: string;
    valueString?: string;
    valueNumber?: number;
    valueDate?: string;
    valueJson?: unknown;
  }>;
};

export default function PersonnelDetailPage() {
  const params = useParams();
  const userId = params.id as string;
  
  const [user, setUser] = useState<DetailUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<string[]>([]);
  const [isHRorSuper, setIsHRorSuper] = useState<boolean>(false);
  const [fieldDefs, setFieldDefs] = useState<Record<string, { label?: string; classification?: string; selfEditable?: boolean }>>({});
  const [deleting, setDeleting] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const [userRes, keysRes, fieldDefsRes, meRes] = await Promise.all([
          userApi.getUser(userId),
          visibilityApi.visibleFieldKeys({ resource: 'user', targetUserId: userId }),
          adminApi.fieldDefinitions(),
          authApi.me().catch(()=>null),
        ]);
        setUser(userRes.user as unknown as DetailUser);
        setVisibleKeys(keysRes.visibleFieldKeys || []);
        type MeRoleObj = { name: string };
        type MeResult = { me?: { roles?: Array<string | MeRoleObj> } } | null | undefined;
        const rolesMixed = (meRes as MeResult)?.me?.roles || [];
        const roleNames = rolesMixed.map((r: string | MeRoleObj) => (typeof r === 'string' ? r : r?.name)).filter(Boolean) as string[];
        setIsHRorSuper(roleNames.includes('super_admin') || roleNames.includes('hr_manager'));
        const defsArray = (fieldDefsRes as unknown as { fieldDefinitions?: Array<{ key: string; label: string; classification: string; selfEditable?: boolean }> })?.fieldDefinitions;
        if (defsArray) {
          const map: Record<string, { label?: string; classification?: string; selfEditable?: boolean }> = {};
          defsArray.forEach((d) => {
            map[d.key] = { label: d.label, classification: d.classification, selfEditable: d.selfEditable };
          });
          setFieldDefs(map);
        }
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

  const shouldShowField = (fieldKey: string) => {
    if (isHRorSuper) return true;
    return visibleKeys.includes(fieldKey);
  };

  const toggleSection = (sectionKey: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(sectionKey)) {
      newCollapsed.delete(sectionKey);
    } else {
      newCollapsed.add(sectionKey);
    }
    setCollapsedSections(newCollapsed);
  };

  const renderSection = ({ key, title, icon, fields }: {
    key: string;
    title: string;
    icon: React.ReactNode;
    fields: string[];
  }) => {
    // 过滤出该分类下可见的字段
    const visibleFields = fields.filter(fieldKey => {
      // 检查字段是否存在定义
      if (!fieldDefs[fieldKey]) return false;
      // 检查字段是否有值
      const fv = (user?.fieldValues || []).find(f => f.fieldKey === fieldKey);
      const hasValue = fv && (fv.valueString || fv.valueNumber || fv.valueDate || fv.valueJson);
      // 检查权限
      const canView = shouldShowField(fieldKey);
      return hasValue && canView;
    });

    // 如果该分类没有可见字段，不显示这个分类
    if (visibleFields.length === 0) return null;

    const isCollapsed = collapsedSections.has(key);

    return (
      <Card key={key}>
        <CardHeader 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleSection(key)}
        >
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <span>{title}</span>
              <span className="text-sm text-muted-foreground font-normal">
                ({visibleFields.length})
              </span>
            </div>
            {isCollapsed ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            )}
          </CardTitle>
        </CardHeader>
        {!isCollapsed && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleFields.map((fieldKey) => {
                const label = fieldDefs[fieldKey]?.label || fieldKey;
                const fv = (user?.fieldValues || []).find(f => f.fieldKey === fieldKey);
                const value = fv?.valueString || fv?.valueNumber || fv?.valueDate || fv?.valueJson || '';
                const visible = visibleKeys.includes(fieldKey) || isHRorSuper;
                const displayValue = value ? renderFieldValue(fieldKey, value) : '-';
                
                return (
                  <div key={fieldKey} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-muted-foreground">{label}</label>
                      {!visible && <EyeOff className="h-3 w-3 text-muted-foreground" />}
                    </div>
                    <p className="text-sm">{displayValue}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>
    );
  };


  const handleBack = () => {
    window.history.back();
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-lg">加载中...</div>
            <div className="text-sm text-muted-foreground mt-2">正在加载人员详情</div>
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

  const renderFieldValue = (fieldKey: string, value: unknown): string => {
    const visible = isHRorSuper ? true : visibleKeys.includes(fieldKey);
    
    if (typeof value === 'string') {
      return maskValue(value, visible);
    } else if (typeof value === 'number') {
      return visible ? value.toString() : '***';
    } else if (value instanceof Date) {
      return visible ? value.toLocaleDateString('zh-CN') : '****/**/**';
    } else if (typeof value === 'string' && value.includes('T')) {
      return visible ? new Date(value).toLocaleDateString('zh-CN') : '****/**/**';
    }
    return visible ? String(value || '') : '***';
  };


  return (
    <AppLayout>
      <div className="space-y-6">
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
          
          <div className="flex items-center gap-3">
            <Button 
              size="sm"
              asChild
            >
              <Link href={`/personnel/${user.id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                编辑
              </Link>
            </Button>
            {/* 权限管理入口已移除至人员列表页 */}
            {isHRorSuper && (
              <Button
                size="sm"
                variant="destructive"
                disabled={deleting}
                onClick={async ()=>{
                  if (!confirm('确认删除该用户？此操作不可恢复。')) return;
                  try {
                    setDeleting(true);
                    const res = await userApi.deleteUser(user.id);
                    if (res?.deleteUser?.success) {
                      toast.success('已删除');
                      window.location.href = '/personnel';
                    } else {
                      toast.error(res?.deleteUser?.message || '删除失败');
                    }
                  } catch (e: unknown) {
                    toast.error('删除失败：' + (e instanceof Error ? e.message : String(e)));
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? '删除中...' : '删除'}
              </Button>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    基本信息
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <Avatar className="h-24 w-24 mx-auto mb-4">
                      <AvatarImage src={user.avatar || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${user.username}`} />
                      <AvatarFallback className="text-2xl">{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <h2 className="text-xl font-semibold mb-2">{user.name}</h2>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? '在职' : '离职'}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">电话</span>
                      <span>{user.phone || '-'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">所在部门</span>
                      <span>{user.department?.name || '-'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {/* 工作信息 */}
              {renderSection({
                key: 'workInfo',
                title: '工作信息',
                icon: <Briefcase className="h-5 w-5" />,
                fields: ['employee_code', 'employee_status', 'employee_type', 'career_sequence', 
                        'reporting_manager', 'business_unit', 'business_unit_leader', 'department', 
                        'position', 'tag', 'join_company_date', 'internship_period_months', 
                        'internship_to_regular_date', 'onboarding_date', 'probation_period_months', 
                        'regularization_date']
              })}

              {/* 个人信息 */}
              {renderSection({
                key: 'personalInfo',
                title: '个人信息',
                icon: <User className="h-5 w-5" />,
                fields: ['gender', 'birth_date', 'age', 'height_cm', 'weight_kg', 'blood_type', 
                        'medical_history', 'nationality', 'ethnicity', 'ancestral_home_province_city', 
                        'political_status', 'first_work_date', 'seniority_calculation_date', 
                        'work_years', 'household_registration_type', 'household_province', 
                        'household_city', 'household_address', 'id_address', 'contact_phone', 
                        'qq', 'wechat', 'personal_email', 'current_residence_address']
              })}

              {/* 证件信息 */}
              {renderSection({
                key: 'documentInfo',
                title: '证件信息',
                icon: <FileText className="h-5 w-5" />,
                fields: ['primary_id_type', 'id_number', 'id_valid_until', 'id_days_remaining']
              })}

              {/* 银行卡信息 */}
              {renderSection({
                key: 'bankInfo',
                title: '银行卡信息',
                icon: <Landmark className="h-5 w-5" />,
                fields: ['bank_account_number', 'bank_name', 'social_security_number', 
                        'provident_fund_account']
              })}

              {/* 合同信息 */}
              {renderSection({
                key: 'contractInfo',
                title: '合同信息',
                icon: <CreditCard className="h-5 w-5" />,
                fields: ['contract_type', 'contract_signed_times', 'latest_contract_start', 
                        'latest_contract_end', 'contract_remaining_days']
              })}

              {/* 教育经历 */}
              {renderSection({
                key: 'educationInfo',
                title: '教育经历',
                icon: <GraduationCap className="h-5 w-5" />,
                fields: ['education_degree', 'enrollment_date', 'major', 'study_form', 
                        'schooling_years', 'degree_awarding_country', 'degree_awarding_institution', 
                        'degree_awarding_date', 'graduation_school', 'graduation_date', 
                        'foreign_language_level']
              })}

              {/* 家庭信息 */}
              {renderSection({
                key: 'familyInfo',
                title: '家庭与婚姻',
                icon: <Users className="h-5 w-5" />,
                fields: ['marital_status', 'marriage_leave_status', 'marriage_leave_date', 
                        'spouse_name', 'spouse_phone', 'spouse_employer', 'spouse_position',
                        'emergency_contact_name', 'emergency_contact_relation', 
                        'emergency_contact_phone', 'emergency_contact_address']
              })}

              {/* 工作履历 */}
              {renderSection({
                key: 'workHistory',
                title: '工作履历',
                icon: <Briefcase className="h-5 w-5" />,
                fields: ['rehire_count', 'previous_join_date', 'previous_leave_date', 
                        'previous_employer', 'non_compete_agreement']
              })}

              {/* 离职信息（如果有） */}
              {renderSection({
                key: 'resignationInfo',
                title: '离职信息',
                icon: <FileText className="h-5 w-5" />,
                fields: ['resignation_date', 'resignation_type', 'resignation_reason_category', 
                        'resignation_reason_detail', 'remarks']
              })}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}