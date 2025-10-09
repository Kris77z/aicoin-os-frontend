'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Tree, TreeNode } from '@/components/ui/tree';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { adminApi, userApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface Company {
  id: string;
  name: string;
  code: string;
}

interface Department {
  id: string;
  name: string;
  parentId?: string;
  companyId?: string;
  leaderUserIds?: string[];
}

interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
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

interface TreeData {
  id: string;
  name: string;
  type: 'company' | 'department' | 'user';
  children?: TreeData[];
  data?: Company | Department | User;
}

export default function PersonnelPage() {
  const [treeData, setTreeData] = useState<TreeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    loadDirectoryData();
  }, []);

  const loadDirectoryData = async () => {
    try {
      setLoading(true);
      
      // 分步加载，companies 查询失败时使用后备公司
      let companies: Company[] = [];
      try {
        const companiesRes = await adminApi.companies();
        companies = companiesRes.companies || [];
      } catch (_) {
        // 后端暂未提供 companies 查询时，使用单一公司占位
        companies = [{ id: 'default-company', name: '深圳用图科技有限公司', code: 'SZTU' }];
      }

      const departmentsRes = await adminApi.departments();
      const departments = (departmentsRes.departments || []) as Department[];

      // 用户查询失败时不阻塞树的渲染
      let users: User[] = [];
      try {
        const usersRes = await userApi.getUsers({ take: 1000 });
        users = usersRes.users?.users || [];
      } catch (error) {
        console.error('用户查询失败:', error);
        users = [];
      }

      // 构建树形结构
      const tree = buildTree(companies, departments, users);
      setTreeData(tree);

      // 默认展开所有公司和主要部门节点
      const companyIds = companies.map((c: Company) => c.id);
      const mainDeptIds = departments.filter(d => !d.parentId).map(d => d.id);
      setExpandedNodes(new Set([...companyIds, ...mainDeptIds]));
    } catch (error) {
      console.error('Failed to load directory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (companies: Company[], departments: Department[], users: User[]): TreeData[] => {
    // 构建固定的组织架构，按照部门文档的层级
    const tree: TreeData[] = [
      {
        id: 'sztu-company',
        name: '深圳用图科技有限公司',
        type: 'company',
        children: [
          {
            id: 'ceo',
            name: '叶裴锋',
            type: 'user',
            children: [
              {
                id: 'general-office',
                name: '总经办',
                type: 'department',
                children: []
              },
              {
                id: 'product-design-center',
                name: '产品设计中心',
                type: 'department',
                children: [
                  {
                    id: 'product-design-director',
                    name: '叶裴锋',
                    type: 'user',
                    children: [
                      {
                        id: 'product-design-division',
                        name: '产品设计事业部',
                        type: 'department',
                        children: [
                          { id: 'product-dept', name: '产品部', type: 'department', children: [] },
                          { id: 'design-dept', name: '设计部', type: 'department', children: [] },
                          { id: 'test-dept', name: '测试部', type: 'department', children: [] },
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                id: 'tech-rd-center',
                name: '技术研发中心',
                type: 'department',
                children: [
                  {
                    id: 'tech-rd-director',
                    name: '温明震',
                    type: 'user',
                    children: [
                      { id: 'pc-division', name: '前沿PC事业部', type: 'department', children: [
                        { id: 'pc-business-dept', name: 'PC业务部', type: 'department', children: [] },
                        { id: 'algorithm-dept', name: '算法策略部', type: 'department', children: [] },
                      ] },
                      { id: 'institutional-division', name: '机构版事业部', type: 'department', children: [
                        { id: 'institutional-business-dept', name: '机构业务部', type: 'department', children: [] },
                        { id: 'rd-innovation-dept', name: '研发创新部', type: 'department', children: [] },
                      ] },
                      { id: 'frontend-kline-division', name: '前端K线事业部', type: 'department', children: [
                        { id: 'frontend-rd-dept', name: '前端研发部', type: 'department', children: [] },
                        { id: 'backend-rd-dept', name: '后端研发部', type: 'department', children: [] },
                        { id: 'im-dept', name: 'IM部', type: 'department', children: [] },
                      ] },
                      { id: 'ai-tech-division', name: 'AI技术事业部', type: 'department', children: [
                        { id: 'ai-tech-dept', name: 'AI技术部', type: 'department', children: [] },
                        { id: 'content-ai-dept', name: '内容AI部', type: 'department', children: [] },
                      ] },
                      { id: 'mobile-division', name: '移动端事业部', type: 'department', children: [
                        { id: 'ios-dept', name: 'iOS', type: 'department', children: [] },
                        { id: 'android-dept', name: 'Android', type: 'department', children: [] },
                        { id: 'cross-platform-dept', name: '跨平台技术部', type: 'department', children: [] },
                        { id: 'onchain-data-dept', name: '链上数据部', type: 'department', children: [] },
                        { id: 'ops-dept', name: '运维部', type: 'department', children: [] },
                      ] },
                      { id: 'backend-division', name: '后台事业部', type: 'department', children: [
                        { id: 'app-dev-dept', name: '应用开发部', type: 'department', children: [] },
                        { id: 'platform-innovation-dept', name: '平台创新部', type: 'department', children: [] },
                      ] },
                    ]
                  }
                ]
              },
              {
                id: 'strategic-operations-center',
                name: '战略运营中心',
                type: 'department',
                children: [
                  {
                    id: 'development-operations-director',
                    name: '林嘉娜',
                    type: 'user',
                    children: [
                      {
                        id: 'enterprise-dev-division',
                        name: '企业发展事业部',
                        type: 'department',
                        children: [
                          {
                            id: 'hr-adm-dept',
                            name: 'HR&ADM部',
                            type: 'department',
                            children: []
                          },
                          {
                            id: 'finance-dept',
                            name: '财务部',
                            type: 'department',
                            children: []
                          },
                          {
                            id: 'legal-dept',
                            name: '法务部',
                            type: 'department',
                            children: []
                          }
                        ]
                      },
                      {
                        id: 'market-operations-division',
                        name: '市场运营事业部',
                        type: 'department',
                        children: [
                          {
                            id: 'content-operations-dept',
                            name: '内容运营部',
                            type: 'department',
                            children: []
                          },
                          {
                            id: 'customer-operations-dept',
                            name: '客户运营部',
                            type: 'department',
                            children: []
                          },
                          {
                            id: 'overseas-expansion-dept',
                            name: '海外拓展部',
                            type: 'department',
                            children: []
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ];

    // 将实际用户分配到对应的部门中
    assignUsersToTree(tree, users);

    return tree;
  };

  const assignUsersToTree = (tree: TreeData[], users: User[]) => {
    // 递归遍历树结构，为每个部门添加对应的用户
    const traverseTree = (nodes: TreeData[]) => {
      nodes.forEach(node => {
        if (node.type === 'department' && node.children) {
          // 根据部门名称匹配用户
          const deptUsers = users.filter(user => {
            if (!user.department) return false;
            return user.department.name === node.name;
          });
          
          // 添加用户到部门下
          deptUsers.forEach(user => {
            node.children!.push({
              id: `user-${user.id}`,
              name: user.name,
              type: 'user',
              data: user
            });
          });
        }
        
        if (node.children) {
          traverseTree(node.children);
        }
      });
    };
    
    traverseTree(tree);
  };


  const filterTree = (nodes: TreeData[], term: string): TreeData[] => {
    if (!term) return nodes;

    return nodes.reduce<TreeData[]>((filtered, node) => {
      const matchesSearch = node.name.toLowerCase().includes(term.toLowerCase()) ||
        (node.type === 'user' && node.data && (node.data as User).email?.toLowerCase().includes(term.toLowerCase()));

      const filteredChildren = node.children ? filterTree(node.children, term) : [];

      if (matchesSearch || filteredChildren.length > 0) {
        filtered.push({
          ...node,
          children: filteredChildren
        });
      }

      return filtered;
    }, []);
  };

  const convertToTreeNodes = (nodes: TreeData[]): TreeNode[] => {
    return nodes.map(node => {
      const isExpanded = expandedNodes.has(node.id);
      const hasChildren = node.children && node.children.length > 0;

      const toggleExpanded = () => {
        const newExpanded = new Set(expandedNodes);
        if (isExpanded) {
          newExpanded.delete(node.id);
        } else {
          newExpanded.add(node.id);
        }
        setExpandedNodes(newExpanded);
      };

      const getIcon = () => {
        if (node.type === 'user' && node.data) {
          const user = node.data as User;
          const fallback = user.name?.[0] || 'U';
          const src = user.avatar || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${user.username || user.email || user.name}`;
          return (
            <div className="mr-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={src} alt={user.name} />
                <AvatarFallback>{fallback}</AvatarFallback>
              </Avatar>
            </div>
          );
        }
        return null; // 其他类型不显示图标
      };

      const getBadge = () => {
        if (node.type === 'user' && node.data) {
          const user = node.data as User;
          const roles = user.roles?.map(r => r.name) || [];
          if (roles.includes('super_admin')) {
            return <Badge variant="destructive" className="ml-2 text-xs">超级管理员</Badge>;
          }
          if (roles.includes('admin')) {
            return <Badge variant="secondary" className="ml-2 text-xs">管理员</Badge>;
          }
          if (roles.includes('hr_manager')) {
            return <Badge variant="outline" className="ml-2 text-xs">HR</Badge>;
          }
        }
        if (node.type === 'department' && node.data) {
          const dept = node.data as Department;
          if (dept.leaderUserIds && dept.leaderUserIds.length > 0) {
            return <Badge variant="outline" className="ml-2 text-xs">负责人: {dept.leaderUserIds.length}人</Badge>;
          }
        }
        return null;
      };

      const getSubtitle = () => {
        if (node.type === 'user' && node.data) {
          const user = node.data as User;
          return user.email;
        }
        // 移除公司英文简写
        return undefined;
      };

      const handleClick = () => {
        if (node.type === 'user' && node.data) {
          router.push(`/directory/${(node.data as User).id}`);
        }
      };

      return {
        id: node.id,
        name: node.name,
        icon: getIcon(),
        badge: getBadge(),
        subtitle: getSubtitle(),
        isExpanded,
        hasChildren,
        onToggle: hasChildren ? toggleExpanded : undefined,
        onClick: node.type === 'user' ? handleClick : undefined,
        children: isExpanded && node.children ? convertToTreeNodes(node.children) : []
      };
    });
  };

  const filteredData = filterTree(treeData, searchTerm);
  const treeNodes = convertToTreeNodes(filteredData);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">加载人员信息...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header with search */}
        <div className="flex items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索人员或部门..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-80 bg-background border-border focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Tree container without card wrapper */}
        <Tree nodes={treeNodes} />
      </div>
    </AppLayout>
  );
}