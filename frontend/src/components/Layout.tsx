import { Fragment, useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { Dialog, Transition } from '@headlessui/react'
import {
  Bars3Icon,
  HomeIcon,
  ChartBarIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  Cog6ToothIcon,
  WrenchScrewdriverIcon,
  CloudArrowDownIcon,
  ScaleIcon,
  MapPinIcon,
  RocketLaunchIcon,
  LightBulbIcon,
  TrophyIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Documentation', href: '/docs', icon: BookOpenIcon },
  { name: 'Strategy Report', href: '/strategy-report', icon: TrophyIcon },
  { name: 'Q&A Insights', href: '/insights', icon: LightBulbIcon },
  { name: 'Customer Segments', href: '/segments', icon: ChartBarIcon },
  { name: 'MSA Markets', href: '/msa', icon: MapPinIcon },
  { name: 'Playbooks', href: '/playbooks', icon: DocumentTextIcon },
  { name: 'Market Intel', href: '/market', icon: GlobeAltIcon },
  { name: 'Competitive Intel', href: '/competitive', icon: ScaleIcon },
  { name: 'Product Roadmap', href: '/product-roadmap', icon: RocketLaunchIcon },
  { name: 'Data Status', href: '/data-status', icon: CloudArrowDownIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  { name: 'Admin Setup', href: '/admin', icon: WrenchScrewdriverIcon },
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="h-full gradient-mesh">
      {/* Mobile sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-950/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-slate-900 px-6 pb-4 ring-1 ring-white/10">
                  <div className="flex h-16 shrink-0 items-center">
                    <Logo />
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                      <li>
                        <ul role="list" className="-mx-2 space-y-1">
                          {navigation.map((item) => (
                            <li key={item.name}>
                              <Link
                                to={item.href}
                                className={classNames(
                                  location.pathname.startsWith(item.href)
                                    ? 'bg-brand-600/20 text-brand-400'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5',
                                  'group flex gap-x-3 rounded-lg p-2 text-sm leading-6 font-medium'
                                )}
                              >
                                <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                    </ul>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-white/10 bg-slate-900/50 px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <Logo />
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className={classNames(
                          location.pathname.startsWith(item.href)
                            ? 'bg-brand-600/20 text-brand-400 border-l-2 border-brand-500'
                            : 'text-slate-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent',
                          'group flex gap-x-3 rounded-r-lg p-3 text-sm leading-6 font-medium transition-all duration-200'
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>

              {/* Quick actions */}
              <li className="mt-auto">
                <div className="text-center py-4">
                  <p className="text-xs text-slate-500">Developed by</p>
                  <p className="text-sm font-semibold text-slate-400">CMACLABS</p>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-white/10 bg-slate-900/50 backdrop-blur-lg px-4 sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-slate-400 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              <h1 className="text-sm font-semibold text-slate-300">
                {getPageTitle(location.pathname)}
              </h1>
            </div>
            <div className="flex items-center gap-x-4">
              {/* User menu */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">Demo User</p>
                  <p className="text-xs text-slate-400">Executive</p>
                </div>
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white text-sm font-semibold">
                  DU
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-8">
          <div className="px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Outlet />
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  )
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700">
        <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-white">Enterprise Strategy v0.9</p>
        <p className="text-xs text-slate-400">Comcast Business</p>
      </div>
    </div>
  )
}

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/dashboard')) return 'Executive Dashboard'
  if (pathname.startsWith('/strategy-report')) return 'Enterprise Strategy Report'
  if (pathname.startsWith('/insights')) return 'Questions & Insights'
  if (pathname.startsWith('/segments')) return 'Customer Segment Analysis'
  if (pathname.startsWith('/msa')) return 'MSA Market Analysis'
  if (pathname.startsWith('/playbooks')) return 'Playbooks'
  if (pathname.startsWith('/market')) return 'Market Intelligence'
  if (pathname.startsWith('/competitive')) return 'Competitive Intelligence'
  if (pathname.startsWith('/product-roadmap')) return 'Product Competitiveness & Roadmap'
  if (pathname.startsWith('/data-status')) return 'Data Status'
  if (pathname.startsWith('/settings')) return 'Settings'
  if (pathname.startsWith('/docs')) return 'Documentation'
  if (pathname.startsWith('/admin')) return 'Admin Setup'
  return ''
}

