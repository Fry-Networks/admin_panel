'use client';

import { Fragment } from 'react';
import { useRouter } from 'next/router';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { signIn, signOut } from 'next-auth/react';
import Image from 'next/image';

type NavItem = { name: string; href: string; disabled?: boolean };

// Keep enabled items first and group disabled items separately for clarity.
const navigation: NavItem[] = [
  { name: 'Devices', href: '/devices' },
  { name: 'Byod', href: '/byod' },
  { name: 'DAO', href: '/dao' },
  { name: 'Announcements', href: '/announcements' },
  { name: 'Users', href: '/users' },
  { name: 'Blacklist', href: '/blacklist' },
  { name: 'Stakes', href: '/stakes' },
  { name: 'Prices', href: '/prices' },
  { name: 'Fry Tokens', href: '/token' },
  { name: 'Rewards', href: '/rewards' },
  { name: 'Crypto Income', href: '/fee' },
  { name: 'Reduction', href: '/reduction' }
];

// Disabled routes remain visible but non-clickable for now.
const disabledNavigation: NavItem[] = [
  { name: 'Weather Accounts', href: '/weather/accounts', disabled: true },
  { name: 'Weather Devices', href: '/weather/devices', disabled: true },
  { name: 'Energy', href: '/energy', disabled: true },
  { name: 'Water', href: '/water', disabled: true },
  { name: 'Air Accounts', href: '/air/accounts', disabled: true }
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

import { useSession } from 'next-auth/react';

export default function Navbar() {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';
  const { pathname } = useRouter();
  if (isLoading) return <div>Loading...</div>; // Or some loading spinner

  return (
    <Disclosure
      as="nav"
      className="bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm"
    >
      {({ open }) => (
        <>
          <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
              <div className="flex">
                <div className="flex flex-shrink-0 items-center">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 32 32"
                    fill="none"
                    className="text-gray-100"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      width="100%"
                      height="100%"
                      rx="16"
                      fill="currentColor"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M17.6482 10.1305L15.8785 7.02583L7.02979 22.5499H10.5278L17.6482 10.1305ZM19.8798 14.0457L18.11 17.1983L19.394 19.4511H16.8453L15.1056 22.5499H24.7272L19.8798 14.0457Z"
                      fill="black"
                    />
                  </svg>
                </div>
                <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:items-center sm:space-x-6">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <a
                        key={item.name}
                        href={item.href}
                        className={classNames(
                          isActive
                            ? 'border-slate-900 text-slate-900'
                            : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300',
                          'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium tracking-wide'
                        )}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {item.name}
                      </a>
                    );
                  })}
                  {/* Divider + label for disabled items */}
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-px bg-slate-200" />
                    <span className="text-[11px] uppercase tracking-widest text-slate-400">
                      Disabled
                    </span>
                  </div>
                  {disabledNavigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <a
                        key={item.name}
                        href={undefined}
                        className={classNames(
                          isActive
                            ? 'border-slate-500 text-gray-900'
                            : 'border-transparent text-gray-400',
                          'cursor-not-allowed opacity-70',
                          'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium'
                        )}
                        title="Currently disabled"
                        aria-current={isActive ? 'page' : undefined}
                        aria-disabled="true"
                        onClick={(event) => {
                          // Prevent navigation for disabled links.
                          event.preventDefault();
                        }}
                      >
                        {item.name}
                      </a>
                    );
                  })}
                </div>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:items-center">
                <Menu as="div" className="relative ml-3">
                  <div>
                    <Menu.Button className="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2">
                      <span className="sr-only">Open user menu</span>
                      <Image
                        className="h-8 w-8 rounded-full"
                        src={
                          session?.user?.image ||
                          'https://avatar.vercel.sh/leerob'
                        }
                        height={32}
                        width={32}
                        alt={`${session?.user?.name || 'placeholder'} avatar`}
                      />
                    </Menu.Button>
                  </div>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      {session?.user ? (
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              className={classNames(
                                active ? 'bg-gray-100' : '',
                                'flex w-full px-4 py-2 text-sm text-gray-700'
                              )}
                              onClick={() => signOut()}
                            >
                              Sign out
                            </button>
                          )}
                        </Menu.Item>
                      ) : (
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              className={classNames(
                                active ? 'bg-gray-100' : '',
                                'flex w-full px-4 py-2 text-sm text-gray-700'
                              )}
                              onClick={() => signIn('github')}
                            >
                              Sign in
                            </button>
                          )}
                        </Menu.Item>
                      )}
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>
              <div className="-mr-2 flex items-center sm:hidden">
                <Disclosure.Button className="inline-flex items-center justify-center rounded-md bg-white p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2">
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          <Disclosure.Panel className="sm:hidden">
            <div className="space-y-1 pt-2 pb-3">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Disclosure.Button
                    key={item.name}
                    as="a"
                    href={item.href}
                    className={classNames(
                      isActive
                        ? 'bg-slate-50 border-slate-500 text-slate-700'
                        : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800',
                      'block pl-3 pr-4 py-2 border-l-4 text-base font-medium'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.name}
                  </Disclosure.Button>
                );
              })}
              {/* Divider + label for disabled items */}
              <div className="px-3 pt-4 pb-2">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-slate-400">
                  <span className="h-px flex-1 bg-slate-200" />
                  <span>Disabled</span>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>
              </div>
              {disabledNavigation.map((item) => (
                <Disclosure.Button
                  key={item.name}
                  as="a"
                  href={undefined}
                  className={classNames(
                    'block pl-3 pr-4 py-2 border-l-4 text-base font-medium',
                    'border-transparent text-gray-400 cursor-not-allowed opacity-70'
                  )}
                  title="Currently disabled"
                  aria-disabled="true"
                  onClick={(event) => {
                    // Prevent navigation for disabled links.
                    event.preventDefault();
                  }}
                >
                  {item.name}
                </Disclosure.Button>
              ))}
            </div>
            <div className="border-t border-gray-200 pt-4 pb-3">
              {session?.user ? (
                <>
                  <div className="flex items-center px-4">
                    <div className="flex-shrink-0">
                      <Image
                        className="h-8 w-8 rounded-full"
                        src={
                          session?.user.image ||
                          'https://avatar.vercel.sh/leerob'
                        }
                        height={32}
                        width={32}
                        alt={`${session?.user.name} avatar`}
                      />
                    </div>
                    <div className="ml-3">
                      <div className="text-base font-medium text-gray-800">
                        {session?.user.name}
                      </div>
                      <div className="text-sm font-medium text-gray-500">
                        {session?.user.email}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <button
                      onClick={() => signOut()}
                      className="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-3 space-y-1">
                  <button
                    onClick={() => signIn('github')}
                    className="flex w-full px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  >
                    Sign in with GitHub
                  </button>
                </div>
              )}
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}
