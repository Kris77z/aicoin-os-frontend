'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type FieldDef = { 
  key: string; 
  label: string; 
  classification: 'PUBLIC' | 'CONFIDENTIAL'; 
  selfEditable?: boolean;
};

// 5个主要字段分类
const FIELD_CATEGORIES = [
  { name: '工作信息', description: '工号、人员状态、部门、职务等工作相关信息' },
  { name: '个人信息', description: '性别、出生日期、民族、籍贯、婚姻状况等' },
  { name: '证件信息', description: '身份标识、身份证/护照号码、证件有效期等' },
  { name: '银行卡信息', description: '银行账号、开户行等银行卡信息' },
  { name: '合同信息', description: '合同类型、签订次数、合同起止日期等' },
];

export default function FieldConfigPage() {
  const [allFields, setAllFields] = useState<FieldDef[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [newFieldForm, setNewFieldForm] = useState<{ category: string; key: string; label: string } | null>(null);

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    try {
      setLoading(true);
      const res = await adminApi.fieldDefinitions();
      const list: FieldDef[] = res.fieldDefinitions || [];
      setAllFields(list);
    } catch (error) {
      console.error('Failed to load fields:', error);
      toast.error('加载字段失败');
    } finally {
      setLoading(false);
    }
  };

  // 根据字段名推断分类（临时方案，后续可通过FieldSet关联）
  const categorizeField = (field: FieldDef): string => {
    const key = field.key.toLowerCase();
    const label = field.label;
    
    // 工作信息关键词
    if (key.includes('employee') || key.includes('job') || key.includes('department') || 
        key.includes('position') || key.includes('work') || key.includes('office') ||
        label.includes('工号') || label.includes('部门') || label.includes('职务') || 
        label.includes('岗位') || label.includes('序列') || label.includes('上级') ||
        label.includes('事业部') || label.includes('入职') || label.includes('转正') ||
        label.includes('试用') || label.includes('实习') || label.includes('状态') ||
        label.includes('类型') || label.includes('标签')) {
      return '工作信息';
    }
    
    // 证件信息关键词
    if (key.includes('id_') || key.includes('passport') || key.includes('document') ||
        label.includes('身份') || label.includes('证件') || label.includes('护照') ||
        label.includes('有效期') || label.includes('剩余')) {
      return '证件信息';
    }
    
    // 银行卡信息关键词
    if (key.includes('bank') || key.includes('account') ||
        label.includes('银行') || label.includes('账号') || label.includes('开户') ||
        label.includes('卡号')) {
      return '银行卡信息';
    }
    
    // 合同信息关键词
    if (key.includes('contract') || label.includes('合同')) {
      return '合同信息';
    }
    
    // 默认归类为个人信息
    return '个人信息';
  };

  // 按分类组织字段
  const fieldsByCategory = FIELD_CATEGORIES.reduce((acc, category) => {
    acc[category.name] = allFields.filter(f => categorizeField(f) === category.name);
    return acc;
  }, {} as Record<string, FieldDef[]>);

  const toggleCategory = (categoryName: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(categoryName)) {
      newCollapsed.delete(categoryName);
    } else {
      newCollapsed.add(categoryName);
    }
    setCollapsedCategories(newCollapsed);
  };

  const handleDeleteField = async (fieldKey: string, fieldLabel: string) => {
    if (!window.confirm(`确定删除字段"${fieldLabel}"？`)) return;
    
    try {
      await adminApi.deleteFieldDefinition(fieldKey);
      toast.success('字段已删除');
      await loadFields();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('删除失败');
    }
  };

  const handleCreateField = async () => {
    if (!newFieldForm) return;
    if (!newFieldForm.key || !newFieldForm.label) {
      toast.error('请填写字段key和名称');
      return;
    }

    try {
      await adminApi.upsertFieldDefinition({
        key: newFieldForm.key,
        label: newFieldForm.label,
        classification: 'PUBLIC', // 新字段默认公开
        selfEditable: false,
      });
      toast.success('字段已创建');
      setNewFieldForm(null);
      await loadFields();
    } catch (error) {
      console.error('Create failed:', error);
      toast.error('创建失败');
    }
  };

  const handleUpdateField = async (field: FieldDef) => {
    try {
      await adminApi.upsertFieldDefinition({
        key: field.key,
        label: field.label,
        classification: field.classification,
        selfEditable: field.selfEditable,
      });
      toast.success('字段已更新');
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('更新失败');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">加载中...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* 按分类显示字段 */}
        {FIELD_CATEGORIES.map(category => {
          const fields = fieldsByCategory[category.name] || [];
          const isCollapsed = collapsedCategories.has(category.name);
          
          return (
            <Card key={category.name} className="p-6">
              <div className="space-y-4">
                {/* 分类标题 */}
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() => toggleCategory(category.name)}
                  >
                    <h2 className="text-lg font-semibold">
                      {category.name} ({fields.length})
                    </h2>
                    <span className="text-sm text-muted-foreground">
                      {category.description}
                    </span>
                    {isCollapsed ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNewFieldForm({ category: category.name, key: '', label: '' })}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    添加字段
                  </Button>
                </div>

                {/* 字段列表 */}
                {!isCollapsed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {fields.map(field => (
                      <div key={field.key} className="border rounded-md p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-muted-foreground font-mono">
                            {field.key}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteField(field.key, field.label)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm">字段名称</Label>
                          <Input
                            value={field.label}
                            onChange={e => {
                              const newFields = allFields.map(f =>
                                f.key === field.key ? { ...f, label: e.target.value } : f
                              );
                              setAllFields(newFields);
                            }}
                            onBlur={() => handleUpdateField(field)}
                            className="h-9"
                          />
                        </div>
                      </div>
                    ))}
                    
                    {fields.length === 0 && (
                      <div className="col-span-2 text-center text-muted-foreground text-sm py-8">
                        暂无字段，点击&quot;添加字段&quot;创建
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}

        {/* 新增字段对话框 */}
        {newFieldForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md p-6 space-y-4">
              <h3 className="text-lg font-semibold">
                添加字段到 {newFieldForm.category}
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>字段Key *</Label>
                  <Input
                    placeholder="例如：employee_code"
                    value={newFieldForm.key}
                    onChange={e => setNewFieldForm({ ...newFieldForm, key: e.target.value })}
                  />
                  <div className="text-xs text-muted-foreground">
                    字段key必须唯一，建议使用小写字母和下划线
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>字段名称 *</Label>
                  <Input
                    placeholder="例如：员工编码"
                    value={newFieldForm.label}
                    onChange={e => setNewFieldForm({ ...newFieldForm, label: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <Button onClick={handleCreateField}>
                  创建
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setNewFieldForm(null)}
                >
                  取消
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
