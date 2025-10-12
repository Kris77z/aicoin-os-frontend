"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ChevronRight, Home } from "lucide-react"

// 面包屑配置
interface BreadcrumbItem {
  title: string
  href?: string
}

// 根据路径生成面包屑
function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = [
    { title: "首页", href: "/kanban" }
  ]

  // 人员管理相关路径
  if (segments[0] === 'personnel') {
    breadcrumbs.push({ title: "人员管理", href: "/personnel" })
    
    if (segments[1] === 'new') {
      breadcrumbs.push({ title: "新建人员" })
    } else if (segments[1] && segments[2] === 'edit') {
      breadcrumbs.push({ title: "人员详情", href: `/personnel/${segments[1]}` })
      breadcrumbs.push({ title: "编辑人员" })
    } else if (segments[1]) {
      breadcrumbs.push({ title: "人员详情" })
    }
  }
  
  // 权限管理相关路径
  else if (segments[0] === 'admin' && segments[1] === 'permissions') {
    breadcrumbs.push({ title: "权限管理", href: "/admin/permissions" })
    
    if (segments[2] === 'preview') {
      breadcrumbs.push({ title: "权限预览" })
    } else if (segments[2] === 'grants') {
      breadcrumbs.push({ title: "临时授权" })
    } else if (segments[2] === 'fields') {
      breadcrumbs.push({ title: "字段管理" })
    } else if (segments[2] === 'visibility') {
      breadcrumbs.push({ title: "可见性管理" })
    }
  }
  
  // 其他路径的默认处理
  else {
    const pageMap: Record<string, string> = {
      "requirements": "需求池",
      "kanban": "任务看板",
      "issues": "Issues"
    }
    
    segments.forEach((segment, index) => {
      const title = pageMap[segment] || segment
      const href = index === segments.length - 1 ? undefined : '/' + segments.slice(0, index + 1).join('/')
      breadcrumbs.push({ title, href })
    })
  }

  return breadcrumbs
}

export function SiteHeader() {
  const pathname = usePathname()
  const breadcrumbs = generateBreadcrumbs(pathname)

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b py-4 transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        
        {/* 面包屑导航 */}
        <nav className="flex items-center space-x-1 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
              )}
              {crumb.href ? (
                <Link 
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {index === 0 ? (
                    <Home className="h-4 w-4" />
                  ) : (
                    crumb.title
                  )}
                </Link>
              ) : (
                <span className="font-medium text-foreground">
                  {crumb.title}
                </span>
              )}
            </div>
          ))}
        </nav>
        
        <div className="ml-auto flex items-center gap-2">
          {/* 这里可以添加其他头部操作按钮 */}
        </div>
      </div>
    </header>
  )
}
