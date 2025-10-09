// API客户端 - 使用RESTful方式调用后端GraphQL
// 约定：API_BASE_URL 指向后端“API前缀根”，例如 http://localhost:3001/api 或 https://xxx.up.railway.app/api
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// 从本地读取登录后的 token
function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem('auth_token');
    } catch {
      return null;
    }
  }
  return null;
}

// GraphQL查询函数
async function graphqlRequest(query: string, variables?: Record<string, unknown>) {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  // 尝试解析 JSON，无论 HTTP 状态码如何
  let result;
  try {
    result = await response.json();
  } catch {
    // 如果无法解析 JSON，则抛出 HTTP 错误
    throw new Error(`HTTP ${response.status}: ${response.statusText} (无法解析响应)`);
  }

  // 检查 GraphQL 错误（优先级更高）
  if (result.errors && result.errors.length > 0) {
    const error = result.errors[0];
    let errorMessage = error.message || 'GraphQL error';
    
    // 对于用户友好的错误消息，不添加技术性信息
    const isUserFriendlyError = errorMessage.includes('邮箱') || 
                               errorMessage.includes('密码') || 
                               errorMessage.includes('账户') ||
                               errorMessage.includes('权限') ||
                               errorMessage.includes('禁用');
    
    if (!isUserFriendlyError) {
      // 只对技术性错误添加调试信息
      if (error.extensions) {
        const { code, status } = error.extensions as { code?: string; status?: number };
        if (code) errorMessage += ` (${code})`;
        if (status && status !== response.status) errorMessage += ` [状态: ${status}]`;
      }
      
      // 添加路径信息（如果有）
      if (error.path && error.path.length > 0) {
        errorMessage += ` - 路径: ${error.path.join('.')}`;
      }
    }
    
    const customError = new Error(errorMessage) as Error & {
      extensions?: Record<string, unknown>;
      locations?: Array<{ line: number; column: number }>;
      path?: string[];
    };
    customError.extensions = error.extensions as Record<string, unknown> | undefined;
    customError.locations = error.locations as Array<{ line: number; column: number }> | undefined;
    customError.path = error.path as string[] | undefined;
    throw customError;
  }

  // 检查 HTTP 错误（如果没有 GraphQL 错误但 HTTP 不成功）
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return result.data;
}

// 认证API
export const authApi = {
  // 登录
  async login(email: string, password: string) {
    const query = `
      mutation Login($input: LoginInputType!) {
        login(input: $input) {
          access_token
          user {
            id
            name
            email
          }
        }
      }
    `;

    const result = await graphqlRequest(query, { input: { email, password } });
    
    // 存储token
    if (result.login.access_token) {
      localStorage.setItem('auth_token', result.login.access_token);
    }
    
    return result.login;
  },
  // 字段定义配置（公开/保密）
  async upsertFieldDefinition(key: string, label: string, classification: 'PUBLIC' | 'CONFIDENTIAL', selfEditable?: boolean) {
    const query = `
      mutation UpsertFieldDef($key: String!, $label: String!, $classification: String!, $selfEditable: Boolean) {
        upsertFieldDefinition(key: $key, label: $label, classification: $classification, selfEditable: $selfEditable)
      }
    `;
    return graphqlRequest(query, { key, label, classification, selfEditable });
  },
  async deleteFieldDefinition(key: string) {
    const query = `
      mutation DeleteFieldDef($key: String!) { deleteFieldDefinition(key: $key) }
    `;
    return graphqlRequest(query, { key });
  },
  // 当前用户
  async me() {
    const query = `
      query Me { me { id email username name avatar roles permissions } }
    `;
    return graphqlRequest(query);
  },

  // 登出
  logout() {
    localStorage.removeItem('auth_token');
  },

  // 检查是否已登录
  isAuthenticated(): boolean {
    return !!getAuthToken();
  }
};

// 我的资料
export const accountApi = {
  async updateMyProfile(input: { name?: string; phone?: string; avatar?: string }) {
    const query = `
      mutation UpdateMyProfile($input: UpdateUserInputType!) {
        updateMyProfile(input: $input) {
          id name email username avatar phone
        }
      }
    `;
    return graphqlRequest(query, { input });
  }
};

// Issue相关API
export const issueApi = {
  // 获取Issue列表
  async getIssues(filters?: {
    projectId?: string;
    status?: string[];
    priority?: string[];
    inputSource?: string[];
    keyword?: string;
  }, pagination?: { skip?: number; take?: number }) {
    const query = `
      query GetIssues($filters: IssueFiltersInput, $pagination: PaginationInput) {
        issues(filters: $filters, pagination: $pagination) {
          issues {
            id
            title
            description
            status
            priority
            inputSource
            issueType
            businessValue
            userImpact
            createdAt
            updatedAt
            dueDate
            creator {
              id
              name
              email
            }
            assignee {
              id
              name
              email
            }
            project {
              id
              name
            }
            comments {
              id
              content
              createdAt
              author {
                name
              }
            }
          }
          total
          hasMore
        }
      }
    `;

    return graphqlRequest(query, { filters, pagination });
  },

  // 获取单个Issue
  async getIssue(id: string) {
    const query = `
      query GetIssue($id: ID!) {
        issue(id: $id) {
          id
          title
          description
          status
          priority
          inputSource
          issueType
          businessValue
          userImpact
          technicalRisk
          createdAt
          updatedAt
          dueDate
          creator {
            id
            name
            email
          }
          assignee {
            id
            name
            email
          }
          project {
            id
            name
          }
          comments {
            id
            content
            createdAt
            author {
              name
            }
            replies {
              id
              content
              createdAt
              author {
                name
              }
            }
          }
          tasks {
            id
            title
            status
            assignee {
              name
            }
          }
          prds {
            id
            title
            status
            author {
              name
            }
          }
        }
      }
    `;

    return graphqlRequest(query, { id });
  },

  // 创建Issue
  async createIssue(input: {
    title: string;
    description?: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    inputSource: 'USER_FEEDBACK' | 'INTERNAL' | 'DATA_ANALYSIS' | 'STRATEGY';
    issueType: 'FEATURE' | 'ENHANCEMENT' | 'BUG_FIX' | 'TECHNICAL_DEBT' | 'RESEARCH';
    projectId: string;
    assigneeId?: string;
    businessValue?: string;
    userImpact?: string;
    technicalRisk?: string;
    dueDate?: string;
  }) {
    const query = `
      mutation CreateIssue($input: CreateIssueInput!) {
        createIssue(input: $input) {
          id
          title
          status
          createdAt
        }
      }
    `;

    return graphqlRequest(query, { input });
  },

  // 更新Issue状态
  async transitionStatus(id: string, targetStatus: string, comment?: string) {
    const query = `
      mutation TransitionIssueStatus($id: ID!, $targetStatus: IssueStatus!, $comment: String) {
        transitionIssueStatus(id: $id, targetStatus: $targetStatus, comment: $comment) {
          id
          status
          updatedAt
        }
      }
    `;

    return graphqlRequest(query, { id, targetStatus, comment });
  },

  // 添加评论
  async addComment(issueId: string, content: string, parentId?: string) {
    const query = `
      mutation AddIssueComment($input: AddIssueCommentInput!) {
        addIssueComment(input: $input) {
          id
          content
          createdAt
          author {
            name
          }
        }
      }
    `;

    return graphqlRequest(query, { input: { issueId, content, parentId } });
  },

  // 获取Issue统计
  async getStats(projectId?: string) {
    const query = `
      query GetIssueStats($projectId: ID) {
        issueStats(projectId: $projectId) {
          total
          byStatus {
            status
            count
          }
          byPriority {
            priority
            count
          }
          byInputSource {
            inputSource
            count
          }
          completionRate
        }
      }
    `;

    return graphqlRequest(query, { projectId });
  },
};

// 项目API (获取项目列表用于Issue创建)
export const projectApi = {
  async getProjects() {
    const query = `
      query GetProjects {
        projects {
          projects {
            id
            name
            key
            description
          }
        }
      }
    `;

    return graphqlRequest(query);
  }
};

// 用户API (获取用户列表用于分配)
export const userApi = {
  async getUsers(params?: {
    filters?: { departmentId?: string; isActive?: boolean; search?: string };
    skip?: number;
    take?: number;
  }) {
    const query = `
      query GetUsers($filters: UserFiltersInput, $skip: Int, $take: Int) {
        users(filters: $filters, skip: $skip, take: $take) {
          users {
            id
            name
            email
            username
            avatar
            phone
            department { id name }
            roles {
              id
              name
            }
          }
          total
        }
      }
    `;

    return graphqlRequest(query, {
      filters: params?.filters,
      skip: params?.skip,
      take: params?.take,
    });
  }
  ,
  // ===== 附件：创建/删除 =====
  async createUserAttachment(input: {
    userId: string;
    attachmentType: string;
    filename: string;
    fileUrl: string;
    mimeType?: string;
    fileSize?: number;
    notes?: string;
  }) {
    const query = `
      mutation CreateUserAttachment($input: CreateUserAttachmentInput!) {
        createUserAttachment(input: $input) { id name attachments }
      }
    `;
    return graphqlRequest(query, { input });
  },
  async deleteUserAttachment(id: string) {
    const query = `
      mutation DeleteUserAttachment($id: String!) {
        deleteUserAttachment(id: $id) { id name attachments }
      }
    `;
    return graphqlRequest(query, { id });
  },

  // ===== 假期余额（只读） =====
  async getUserLeaveBalances(userId: string) {
    const query = `
      query UserLeaveBalances($userId: String!) {
        userLeaveBalances(userId: $userId) { type total used available }
      }
    `;
    return graphqlRequest(query, { userId });
  },

  // ===== Storage：获取直传上传URL =====
  async createAttachmentUploadUrl(params: { userId: string; attachmentType: string; filename: string }) {
    const query = `
      mutation CreateAttachmentUploadUrl($userId: String!, $attachmentType: String!, $filename: String!) {
        createAttachmentUploadUrl(userId: $userId, attachmentType: $attachmentType, filename: $filename)
      }
    `;
    return graphqlRequest(query, params);
  },

  // ===== Storage：获取签名下载URL =====
  async createAttachmentDownloadUrl(objectPath: string) {
    const query = `
      query CreateAttachmentDownloadUrl($objectPath: String!) {
        createAttachmentDownloadUrl(objectPath: $objectPath)
      }
    `;
    return graphqlRequest(query, { objectPath });
  }
  ,
  async getUser(id: string) {
    const query = `
      query GetUser($id: String!) {
        user(id: $id) {
          id
          name
          email
          username
          avatar
          phone
          isActive
          createdAt
          updatedAt
          department { id name }
          fieldValues {
            fieldKey
            valueString
            valueNumber
            valueDate
            valueJson
          }
          educations {
            id
            degree
            school
            major
            startDate
            endDate
          }
          workExperiences {
            id
            company
            position
            startDate
            endDate
          }
          emergencyContacts {
            id
            name
            relation
            phone
          }
          familyMembers {
            id
            name
            relation
          }
          contracts {
            id
            contractNo
            contractType
            company
            startDate
            endDate
          }
          documents {
            id
            docType
            docNumber
            validUntil
          }
          bankAccounts {
            id
            accountName
            bankName
            accountNumber
          }
          attachments
        }
      }
    `;
    return graphqlRequest(query, { id });
  }
  ,
  async createUser(input: {
    email: string; username?: string; name: string; password: string; departmentId?: string; phone?: string;
  }) {
    const query = `
      mutation CreateUser($input: CreateUserInputType!) {
        createUser(input: $input) { id name email username }
      }
    `;
    return graphqlRequest(query, { input });
  }
  ,
  async updateUser(id: string, input: { 
    name?: string; 
    phone?: string; 
    avatar?: string;
    departmentId?: string; 
    isActive?: boolean;
  }) {
    const query = `
      mutation UpdateUser($id: String!, $input: UpdateUserInputType!) {
        updateUser(id: $id, input: $input) { 
          id name email username avatar phone isActive 
          department { id name }
          fieldValues { id fieldKey valueString valueNumber valueDate valueJson }
          educations { id degree school major startDate endDate }
          workExperiences { id company position startDate endDate }
          familyMembers { id name relation }
          emergencyContacts { id name relation phone }
          contracts { id contractNo contractType company startDate endDate }
          documents { id docType docNumber validUntil }
          bankAccounts { id accountName bankName accountNumber }
          attachments
        }
      }
    `;
    return graphqlRequest(query, { id, input });
  },

  async updateUserFieldValues(userId: string, entries: Array<{
    fieldKey: string;
    valueString?: string;
    valueNumber?: number;
    valueDate?: string;
    valueJson?: unknown;
  }>) {
    const query = `
      mutation UpdateUserFieldValues($userId: String!, $entries: [UpdateUserFieldValueEntryInput!]!) {
        updateUserFieldValues(userId: $userId, entries: $entries) {
          id name email username phone isActive 
          department { id name }
          fieldValues { id fieldKey valueString valueNumber valueDate valueJson }
          educations { id degree school major startDate endDate }
          workExperiences { id company position startDate endDate }
          familyMembers { id name relation }
          emergencyContacts { id name relation phone }
          contracts { id contractNo contractType company startDate endDate }
          documents { id docType docNumber validUntil }
          bankAccounts { id accountName bankName accountNumber }
          attachments
        }
      }
    `;
    return graphqlRequest(query, { userId, entries });
  },

  async updatePassword(currentPassword: string, newPassword: string) {
    const query = `
      mutation UpdatePassword($input: UpdatePasswordInputType!) {
        updatePassword(input: $input)
      }
    `;
    return graphqlRequest(query, { 
      input: { currentPassword, newPassword } 
    });
  },

  async importUsers(text: string) {
    const query = `
      mutation ImportUsers($text: String!) {
        importUsers(text: $text) { created skipped errors }
      }
    `;
    return graphqlRequest(query, { text });
  },

  async deleteUser(id: string) {
    const query = `
      mutation DeleteUser($id: String!) {
        deleteUser(id: $id) { success message }
      }
    `;
    return graphqlRequest(query, { id });
  },

  async userImportHeaders() {
    const query = `
      query UserImportHeaders { userImportHeaders }
    `;
    return graphqlRequest(query, {});
  },

  async upsertUserEducation(input: {
    id?: string;
    userId: string;
    degree?: string;
    school?: string;
    enrollDate?: string;
    graduateDate?: string;
    major?: string;
    studyForm?: string;
    schoolingYears?: number;
    degreeName?: string;
    awardingCountry?: string;
    awardingInstitution?: string;
    awardingDate?: string;
    languageLevel?: string;
  }) {
    const query = `
      mutation UpsertUserEducation($input: UpsertEducationInput!) {
        upsertUserEducation(input: $input) {
          id name educations
        }
      }
    `;
    return graphqlRequest(query, { input });
  },

  async deleteUserEducation(id: string) {
    const query = `
      mutation DeleteUserEducation($id: String!) {
        deleteUserEducation(id: $id) {
          id name educations
        }
      }
    `;
    return graphqlRequest(query, { id });
  },

  async upsertUserWorkExperience(input: {
    id?: string;
    userId: string;
    company?: string;
    department?: string;
    position?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const query = `
      mutation UpsertUserWorkExperience($input: UpsertWorkExperienceInput!) {
        upsertUserWorkExperience(input: $input) {
          id name workExperiences { id company position startDate endDate }
        }
      }
    `;
    return graphqlRequest(query, { input });
  },

  async deleteUserWorkExperience(id: string) {
    const query = `
      mutation DeleteUserWorkExperience($id: String!) {
        deleteUserWorkExperience(id: $id) {
          id name workExperiences { id company position startDate endDate }
        }
      }
    `;
    return graphqlRequest(query, { id });
  },

  async upsertUserEmergencyContact(input: {
    id?: string;
    userId: string;
    name: string;
    relation?: string;
    phone: string;
    address?: string;
  }) {
    const query = `
      mutation UpsertUserEmergencyContact($input: UpsertEmergencyContactInput!) {
        upsertUserEmergencyContact(input: $input) {
          id name emergencyContacts { id name relation phone }
        }
      }
    `;
    return graphqlRequest(query, { input });
  },

  async deleteUserEmergencyContact(id: string) {
    const query = `
      mutation DeleteUserEmergencyContact($id: String!) {
        deleteUserEmergencyContact(id: $id) {
          id name emergencyContacts { id name relation phone }
        }
      }
    `;
    return graphqlRequest(query, { id });
  },

  async upsertUserFamilyMember(input: {
    id?: string;
    userId: string;
    name: string;
    relation: string;
    organization?: string;
    contact?: string;
  }) {
    const query = `
      mutation UpsertUserFamilyMember($input: UpsertFamilyMemberInput!) {
        upsertUserFamilyMember(input: $input) {
          id name familyMembers
        }
      }
    `;
    return graphqlRequest(query, { input });
  },

  async deleteUserFamilyMember(id: string) {
    const query = `
      mutation DeleteUserFamilyMember($id: String!) {
        deleteUserFamilyMember(id: $id) {
          id name familyMembers
        }
      }
    `;
    return graphqlRequest(query, { id });
  },

  async upsertUserContract(input: {
    id?: string;
    userId: string;
    contractNo?: string;
    company?: string;
    contractType?: string;
    startDate?: string;
    endDate?: string;
    actualEndDate?: string;
    signedTimes?: number;
  }) {
    const query = `
      mutation UpsertUserContract($input: UpsertContractInput!) {
        upsertUserContract(input: $input) {
          id name contracts
        }
      }
    `;
    return graphqlRequest(query, { input });
  },

  async deleteUserContract(id: string) {
    const query = `
      mutation DeleteUserContract($id: String!) {
        deleteUserContract(id: $id) {
          id name contracts
        }
      }
    `;
    return graphqlRequest(query, { id });
  },

  async upsertUserDocument(input: {
    id?: string;
    userId: string;
    docType: string;
    docNumber: string;
    validUntil?: string;
  }) {
    const query = `
      mutation UpsertUserDocument($input: UpsertDocumentInput!) {
        upsertUserDocument(input: $input) {
          id name documents
        }
      }
    `;
    return graphqlRequest(query, { input });
  },

  async deleteUserDocument(id: string) {
    const query = `
      mutation DeleteUserDocument($id: String!) {
        deleteUserDocument(id: $id) {
          id name documents
        }
      }
    `;
    return graphqlRequest(query, { id });
  },

  async upsertUserBankAccount(input: {
    id?: string;
    userId: string;
    accountName?: string;
    bankName?: string;
    bankBranch?: string;
    accountNumber?: string;
  }) {
    const query = `
      mutation UpsertUserBankAccount($input: UpsertBankAccountInput!) {
        upsertUserBankAccount(input: $input) {
          id name bankAccounts
        }
      }
    `;
    return graphqlRequest(query, { input });
  },

  async deleteUserBankAccount(id: string) {
    const query = `
      mutation DeleteUserBankAccount($id: String!) {
        deleteUserBankAccount(id: $id) {
          id name bankAccounts
        }
      }
    `;
    return graphqlRequest(query, { id });
  }
};

// 任务API
export const taskApi = {
  // 获取任务列表
  async getTasks(filters?: {
    projectId?: string;
    issueId?: string;
    assigneeId?: string;
    status?: string;
    priority?: string;
    search?: string;
  }, pagination?: { skip?: number; take?: number }) {
    const query = `
      query GetTasks($filters: TaskFiltersInput, $skip: Int, $take: Int) {
        tasks(filters: $filters, skip: $skip, take: $take) {
          tasks {
            id
            title
            description
            status
            priority
            startDate
            dueDate
            estimatedHours
            actualHours
            createdAt
            updatedAt
          }
          total
        }
      }
    `;

    return graphqlRequest(query, { 
      filters, 
      skip: pagination?.skip, 
      take: pagination?.take 
    });
  },

  // 获取单个任务
  async getTask(id: string) {
    const query = `
      query GetTask($id: ID!) {
        task(id: $id) {
          id
          title
          description
          status
          priority
          startDate
          dueDate
          estimatedHours
          actualHours
          createdAt
          updatedAt
          assignee {
            id
            name
            email
            username
          }
          creator {
            id
            name
            email
          }
          project {
            id
            name
            key
          }
          issue {
            id
            title
          }
        }
      }
    `;

    return graphqlRequest(query, { id });
  },

  // 创建任务
  async createTask(input: {
    title: string;
    description?: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    status?: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
    projectId: string;
    issueId?: string;
    assigneeId?: string;
    estimatedHours?: number;
    startDate?: string;
    dueDate?: string;
  }) {
    const query = `
      mutation CreateTask($input: CreateTaskInput!) {
        createTask(input: $input) {
          id
          title
          status
          createdAt
        }
      }
    `;

    return graphqlRequest(query, { input });
  },

  // 更新任务状态
  async updateTaskStatus(id: string, status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE') {
    const query = `
      mutation UpdateTask($id: ID!, $input: UpdateTaskInput!) {
        updateTask(id: $id, input: $input) {
          id
          status
          updatedAt
        }
      }
    `;

    return graphqlRequest(query, { id, input: { status } });
  },
};

// 可见性与权限（用户侧）
export const visibilityApi = {
  async visibleFieldKeys(params: { resource: string; targetUserId?: string }) {
    const query = `
      query VisibleFieldKeys($resource: String!, $targetUserId: String) {
        visibleFieldKeys(resource: $resource, targetUserId: $targetUserId)
      }
    `;
    return graphqlRequest(query, params);
  },

  async accessPreview(params: { resource?: string; targetUserId?: string }) {
    const query = `
      query AccessPreview($resource: String, $targetUserId: String) {
        accessPreview(resource: $resource, targetUserId: $targetUserId)
      }
    `;
    return graphqlRequest(query, params);
  },

  async exportUsersCsv(filters?: Record<string, unknown>) {
    const query = `
      query ExportUsers($filters: UserFiltersInput) {
        exportUsersCsv(filters: $filters)
      }
    `;
    return graphqlRequest(query, { filters });
  },
};

// 管理端（仅管理员）
export const adminApi = {
  async companies() {
    const query = `
      query Companies { 
        companies { 
          id 
          name 
          code 
        } 
      }
    `;
    return graphqlRequest(query);
  },
  async departments() {
    const query = `
      query Departments { 
        departments { 
          id 
          name 
          parentId 
          leaderUserIds
        } 
      }
    `;
    return graphqlRequest(query);
  },
  async fieldDefinitions() {
    const query = `
      query FieldDefs {
        fieldDefinitions {
          key
          label
          classification
          selfEditable
        }
      }
    `;
    return graphqlRequest(query);
  },

  // 获取所有角色
  async getRoles() {
    const query = `
      query GetRoles {
        roles {
          id
          name
          description
          isSystem
        }
      }
    `;
    return graphqlRequest(query);
  },

  // 设置用户角色
  async setUserRoles(userId: string, roleNames: string[]) {
    const query = `
      mutation SetUserRoles($userId: String!, $roleNames: [String!]!) {
        setUserRoles(userId: $userId, roleNames: $roleNames)
      }
    `;
    return graphqlRequest(query, { userId, roleNames });
  },

  // 获取用户详细权限信息
  async getUserPermissions(userId: string) {
    const query = `
      query GetUserPermissions($userId: String!) {
        user(id: $userId) {
          id
          name
          email
          roles { id name description isSystem }
          permissions { id name resource action description }
        }
      }
    `;
    return graphqlRequest(query, { userId });
  },

  async fieldSets() {
    const query = `
      query FieldSets {
        fieldSets
      }
    `;
    return graphqlRequest(query);
  },

  async upsertFieldDefinition(input: {
    key: string; label: string; classification: string; selfEditable?: boolean;
  }) {
    const query = `
      mutation UpsertFieldDefinition($key: String!, $label: String!, $cls: String!, $self: Boolean) {
        upsertFieldDefinition(key: $key, label: $label, classification: $cls, selfEditable: $self)
      }
    `;
    return graphqlRequest(query, {
      key: input.key,
      label: input.label,
      cls: input.classification,
      self: input.selfEditable,
    });
  },

  async deleteFieldDefinition(key: string) {
    const query = `
      mutation DeleteFieldDefinition($key: String!) {
        deleteFieldDefinition(key: $key)
      }
    `;
    return graphqlRequest(query, { key });
  },

  async upsertModuleVisibility(input: { moduleKey: string; classification: string }) {
    const query = `
      mutation UpsertModuleVisibility($moduleKey: String!, $cls: String!) {
        upsertModuleVisibility(moduleKey: $moduleKey, classification: $cls)
      }
    `;
    return graphqlRequest(query, { moduleKey: input.moduleKey, cls: input.classification });
  },

  async applyGroupVisibility(setName: string, classification: string) {
    const query = `
      mutation ApplyGroupVisibility($setName: String!, $cls: String!) {
        applyGroupVisibility(setName: $setName, classification: $cls)
      }
    `;
    return graphqlRequest(query, { setName, cls: classification });
  },

  async upsertFieldSet(input: { name: string; description?: string; isSystem?: boolean }) {
    const query = `
      mutation UpsertFieldSet($name: String!, $desc: String, $sys: Boolean) {
        upsertFieldSet(name: $name, description: $desc, isSystem: $sys)
      }
    `;
    return graphqlRequest(query, {
      name: input.name,
      desc: input.description,
      sys: input.isSystem,
    });
  },

  async assignFieldsToSet(setName: string, fieldKeys: string[]) {
    const query = `
      mutation AssignFields($setName: String!, $keys: [String!]!) {
        assignFieldsToSet(setName: $setName, fieldKeys: $keys)
      }
    `;
    return graphqlRequest(query, { setName, keys: fieldKeys });
  },

  async setUserVisibility(input: { userId: string; hidden?: boolean; viewScope?: string }) {
    const query = `
      mutation SetUserVisibility($userId: String!, $hidden: Boolean, $viewScope: String) {
        setUserVisibility(userId: $userId, hidden: $hidden, viewScope: $viewScope)
      }
    `;
    return graphqlRequest(query, input);
  },

  async updateDepartmentLeaders(input: { departmentId: string; leaderUserIds: string[] }) {
    const query = `
      mutation UpdateDepartmentLeaders($departmentId: String!, $leaderUserIds: [String!]!) {
        updateDepartmentLeaders(departmentId: $departmentId, leaderUserIds: $leaderUserIds)
      }
    `;
    return graphqlRequest(query, input);
  },

  async createTemporaryAccessGrant(input: {
    granteeId: string;
    resource: string;
    fieldKey: string;
    action: string;
    startAt: string;
    endAt: string;
    allowCrossBoundary?: boolean;
    scopeDepartmentId?: string;
  }) {
    // 已移除：临时授权功能不再提供
    throw new Error('temporary access grant is removed');
  },
};

