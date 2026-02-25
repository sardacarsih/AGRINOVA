"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Home,
  Users,
  UserCheck,
  Truck,
  Shield,
  ShieldCheck,
  Factory,
  Map,
  ChevronDown,
  ChevronRight,
  Scale,
  Star,
  ClipboardList,
  BarChart3,
  Settings,
  FileText,
  Clock,

  Lock,
  Building,
  UserCog,
  Menu,
  LayoutGrid,
  Link2
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useMemo, useState } from "react"

type NavigationItem = {
  name: string
  href: string
  icon: LucideIcon
  current: boolean
}

// Role-based navigation configuration
const roleBasedNavigation = {
  MANDOR: {
    main: [
      { name: "Dashboard", href: "/", icon: Home, current: false },
    ],
    harvest: [
      { name: "Record Sync Mobile", href: "/harvest", icon: ClipboardList, current: false },
      { name: "Histori Panen", href: "/harvest/history", icon: Clock, current: false },
    ]
  },
  ASISTEN: {
    main: [
      { name: "Dashboard", href: "/", icon: Home, current: false },
    ],
    harvest: [
      { name: "Approval Panen", href: "/approvals", icon: ClipboardList, current: false },
      { name: "Timbangan", href: "/timbangan", icon: Scale, current: false },
      { name: "Grading", href: "/grading", icon: Star, current: false },
    ],
    management: [
      { name: "Struktur Organisasi", href: "/struktur-organisasi", icon: Users, current: false },
      { name: "Karyawan", href: "/users", icon: Users, current: false },
      { name: "Laporan Panen", href: "/harvest", icon: FileText, current: false },
    ]
  },
  MANAGER: {
    main: [
      { name: "Dashboard", href: "/", icon: Home, current: false },
    ],
    operations: [
      { name: "Manajemen Panen", href: "/harvest", icon: ClipboardList, current: false },
      { name: "Tim Estate", href: "/tim-estate", icon: Users, current: false },
      { name: "Timbangan", href: "/timbangan", icon: Scale, current: false },
      { name: "Grading", href: "/grading", icon: Star, current: false },
      { name: "Gate Check", href: "/gate-check", icon: Shield, current: false },
    ],
    management: [
      { name: "Struktur Organisasi", href: "/struktur-organisasi", icon: Users, current: false },
      { name: "Budget Divisi", href: "/budget-divisi", icon: Users, current: false },
      { name: "Laporan", href: "/reports", icon: BarChart3, current: false },
      { name: "Analytics", href: "/analytics", icon: BarChart3, current: false },
    ]
  },
  AREA_MANAGER: {
    main: [
      { name: "Dashboard", href: "/", icon: Home, current: false },
    ],
    oversight: [
      { name: "Monitoring Panen", href: "/harvest", icon: ClipboardList, current: false },
      { name: "Timbangan", href: "/timbangan", icon: Scale, current: false },
      { name: "Grading", href: "/grading", icon: Star, current: false },
      { name: "Gate Check", href: "/gate-check", icon: Shield, current: false },
    ],
    reporting: [
      { name: "Struktur Organisasi", href: "/struktur-organisasi", icon: Users, current: false },
      { name: "Laporan Regional", href: "/reports", icon: FileText, current: false },
      { name: "Analitik Regional", href: "/analytics", icon: BarChart3, current: false },
    ]
  },
  SATPAM: {
    main: [
      { name: "Dashboard", href: "/", icon: Home, current: false },
    ],
    security: [
      { name: "Gate Check", href: "/gate-check", icon: Shield, current: false },
    ]
  },
  TIMBANGAN: {
    main: [
      { name: "Dashboard", href: "/", icon: Home, current: false },
    ],
    weighing: [
      { name: "Timbangan TBS", href: "/timbangan", icon: Scale, current: false },
      { name: "Analitik Timbangan", href: "/analytics", icon: BarChart3, current: false },
    ],
    operations: [
      { name: "Laporan Harian", href: "/reports", icon: FileText, current: false },
      { name: "Sinkronisasi Gate", href: "/gate-check/sync", icon: Shield, current: false },
    ]
  },
  GRADING: {
    main: [
      { name: "Dashboard", href: "/", icon: Home, current: false },
    ],
    grading: [
      { name: "Grading TBS", href: "/grading", icon: Star, current: false },
      { name: "Inspeksi Kualitas", href: "/grading", icon: ShieldCheck, current: false },
      { name: "Laporan Grading", href: "/reports", icon: FileText, current: false },
    ],
    analytics: [
      { name: "Statistik Kualitas", href: "/analytics", icon: BarChart3, current: false },
      { name: "Ringkasan Dashboard", href: "/", icon: Home, current: false },
    ]
  },
  COMPANY_ADMIN: {
    main: [
      { name: "Dashboard", href: "/", icon: Home, current: false },
    ],
    company: [
      { name: "Users Management", href: "/users", icon: Users, current: false },
      { name: "Karyawan", href: "/employees", icon: UserCheck, current: false },
      { name: "Unit Kendaraan", href: "/vehicles", icon: Truck, current: false },
      { name: "Estate", href: "/estates", icon: Factory, current: false },
      { name: "Divisi", href: "/divisions", icon: Map, current: false },
      { name: "Blok", href: "/blocks", icon: LayoutGrid, current: false },
    ]
  },
  SUPER_ADMIN: {
    main: [
      { name: "Dashboard", href: "/", icon: Home, current: false },
    ],
    system: [
      { name: "User Management", href: "/users", icon: UserCog, current: false },
      { name: "Companies", href: "/companies", icon: Building, current: false },
      { name: "BKM Company Bridge", href: "/bkm-company-bridge", icon: Link2, current: false },
    ],
    administration: [
      { name: "API Management", href: "/api-management", icon: Lock, current: false },
      { name: "Roles & Permissions", href: "/rbac-management", icon: ShieldCheck, current: false },
      { name: "Management Sessions", href: "/management-sessions", icon: Clock, current: false },
      { name: "Management Token", href: "/management-token", icon: Lock, current: false },
    ]
  }
}

// Section configurations
const sectionConfig = {
  main: {
    title: "Utama",
    icon: Home
  },
  harvest: {
    title: "Panen & Operasional",
    icon: ClipboardList
  },
  operations: {
    title: "Operasional",
    icon: Settings
  },
  oversight: {
    title: "Monitoring",
    icon: BarChart3
  },
  security: {
    title: "Keamanan",
    icon: Shield
  },
  management: {
    title: "Manajemen",
    icon: Users
  },
  company: {
    title: "Perusahaan",
    icon: Building
  },
  system: {
    title: "Sistem",
    icon: Settings
  },
  reporting: {
    title: "Laporan",
    icon: FileText
  },
  administration: {
    title: "Administrasi & Keamanan",
    icon: ShieldCheck
  },
  weighing: {
    title: "Timbangan",
    icon: Scale
  },
  grading: {
    title: "Kontrol Kualitas",
    icon: Star
  },
  analytics: {
    title: "Analitik",
    icon: BarChart3
  }
}

interface SidebarProps {
  userRole: string
  userName: string
  companyName?: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function UnifiedSidebar({ userRole, userName: _userName, companyName, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const normalizedPathname = useMemo(() => {
    const rawPath = pathname || "/"
    const withoutLocale = rawPath.replace(/^\/[a-z]{2}(?=\/|$)/, "")
    if (!withoutLocale) return "/"
    if (withoutLocale === "/") return "/"
    return withoutLocale.replace(/\/+$/, "") || "/"
  }, [pathname])

  const normalizedRole = userRole.trim().toUpperCase().replace(/[\s-]+/g, "_")
  const isCompanyAdmin = normalizedRole === "COMPANY_ADMIN"
  const roleConfig = roleBasedNavigation[normalizedRole as keyof typeof roleBasedNavigation]

  if (!roleConfig) {
    console.warn(`No navigation configuration found for role: ${userRole} (normalized: ${normalizedRole})`)
    return null
  }

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const normalizeHref = (href: string) => (href === "/" ? "/" : href.replace(/\/+$/, ""))

  const isItemActive = (href: string, sectionItems: NavigationItem[] = []) => {
    const normalizedHref = normalizeHref(href)
    if (normalizedHref === "/") {
      return normalizedPathname === "/"
    }

    if (normalizedPathname === normalizedHref) {
      return true
    }

    if (!normalizedPathname.startsWith(normalizedHref + "/")) {
      return false
    }

    // Prefer the most specific matching path to avoid multiple active items,
    // e.g. "/harvest" and "/harvest/history" being active at the same time.
    const hasMoreSpecificMatch = sectionItems.some((item) => {
      const itemHref = normalizeHref(item.href)
      if (itemHref === normalizedHref) return false
      if (!itemHref.startsWith(normalizedHref + "/")) return false
      return normalizedPathname === itemHref || normalizedPathname.startsWith(itemHref + "/")
    })

    return !hasMoreSpecificMatch
  }

  const renderNavigationSection = (sectionKey: string, items: NavigationItem[]) => {
    if (items.length === 0) return null

    const sectionInfo = sectionConfig[sectionKey as keyof typeof sectionConfig]
    const isSectionCollapsed = collapsedSections[sectionKey]

    return (
      <div key={sectionKey} className="mb-2">
        <Collapsible
          open={!isSectionCollapsed}
          onOpenChange={() => toggleSection(sectionKey)}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-between h-8 px-2 text-sm font-medium",
                isCompanyAdmin
                  ? "text-orange-700/80 hover:bg-orange-100/70 hover:text-orange-900 dark:text-orange-300 dark:hover:bg-orange-950/60 dark:hover:text-orange-100"
                  : "text-muted-foreground hover:text-foreground",
                isCollapsed && "hidden"
              )}
            >
              <span className="flex items-center gap-2">
                <sectionInfo.icon className="h-4 w-4" />
                {sectionInfo.title}
              </span>
              {isSectionCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className={cn("space-y-1", isCollapsed ? "pl-0" : "pl-6")}>
              {items.map((item) => {
                const isActive = isItemActive(item.href, items)

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    title={isCollapsed ? item.name : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      isCompanyAdmin &&
                        !isActive &&
                        "text-slate-700 hover:bg-orange-50 hover:text-orange-900 dark:text-orange-200/90 dark:hover:bg-orange-950/50 dark:hover:text-orange-100",
                      isCompanyAdmin &&
                        isActive &&
                        "bg-orange-100 text-orange-900 ring-1 ring-orange-200 dark:bg-orange-900/40 dark:text-orange-100 dark:ring-orange-700/50",
                      !isCompanyAdmin &&
                        "hover:bg-accent hover:text-accent-foreground",
                      !isCompanyAdmin &&
                        (isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"),
                      isCollapsed && "justify-center px-2"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>{item.name}</span>}
                    {isActive && !isCollapsed && (
                      <Badge
                        variant="secondary"
                        className={cn("ml-auto", isCompanyAdmin && "bg-orange-200/80 text-orange-900 dark:bg-orange-900/60 dark:text-orange-100")}
                      >
                        Aktif
                      </Badge>
                    )}
                  </Link>
                )
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex h-full flex-col border-r",
      isCompanyAdmin
        ? "border-orange-200/80 bg-gradient-to-b from-orange-50/70 via-amber-50/40 to-white dark:border-orange-900/40 dark:from-orange-950/40 dark:via-amber-950/25 dark:to-background"
        : "bg-background",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div
        className={cn(
          "flex h-16 items-center border-b px-4",
          isCompanyAdmin ? "border-orange-200/80 bg-white/70 dark:border-orange-900/40 dark:bg-orange-950/20" : ""
        )}
      >
        {isCollapsed ? (
          <Button variant="ghost" size="icon" onClick={onToggleCollapse} className={cn(isCompanyAdmin && "text-orange-800 hover:bg-orange-100 dark:text-orange-200 dark:hover:bg-orange-900/40")}>
            <Menu className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div>
              <h2 className="text-lg font-semibold">Agrinova</h2>
              {companyName ? (
                <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                  {companyName}
                </p>
              ) : (
                <p className={cn("text-xs", isCompanyAdmin ? "text-orange-700 dark:text-orange-300" : "text-muted-foreground")}>
                  Workspace
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className={cn(isCompanyAdmin && "text-orange-800 hover:bg-orange-100 dark:text-orange-200 dark:hover:bg-orange-900/40")}
            >
              <ChevronDown className="h-4 w-4 rotate-270" />
            </Button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
        <div className="space-y-4">
          {Object.entries(roleConfig).map(([sectionKey, items]) =>
            renderNavigationSection(sectionKey, items)
          )}
        </div>
      </ScrollArea>


    </div>
  )
}

