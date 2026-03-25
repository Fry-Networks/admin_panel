'use client';

import { Fragment } from 'react';
import { useRouter } from 'next/router';
import { Disclosure, Menu, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { signIn, signOut } from 'next-auth/react';
import Image from 'next/image';
import { logoLight } from '../components/logos';

type NavItem = { name: string; href: string; disabled?: boolean };

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
  if (isLoading) return <div className="text-gray-400 p-4">Loading...</div>;

  return (
    <Disclosure
      as="nav"
      className="bg-gray-900 backdrop-blur border-b border-gray-700 shadow-sm"
    >
      {({ open }) => (
        <>
          <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
              <div className="flex">
                <div className="flex flex-shrink-0 items-center">
                  <img
                    src={logoLight}
                    alt="Fry Networks"
                    width={32}
                    height={32}
                    className="h-8 w-auto"
                  />
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
                            ? 'border-red-500 text-white'
                            : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500',
                          'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium tracking-wide'
                        )}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {item.name}
                      </a>
                    );
                  })}
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-px bg-gray-700" />
                    <span className="text-[11px] uppercase tracking-widest text-gray-500">
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
                            ? 'border-gray-500 text-gray-400'
                            : 'border-transparent text-gray-500',
                          'cursor-not-allowed opacity-70',
                          'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium'
                        )}
                        title="Currently disabled"
                        aria-current={isActive ? 'page' : undefined}
                        aria-disabled="true"
                        onClick={(event) => {
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
                    <Menu.Button className="flex rounded-full bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900">
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
                    <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      {session?.user ? (
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              className={classNames(
                                active ? 'bg-gray-700' : '',
                                'flex w-full px-4 py-2 text-sm text-gray-200'
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
                                active ? 'bg-gray-700' : '',
                                'flex w-full px-4 py-2 text-sm text-gray-200'
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
                <Disclosure.Button className="inline-flex items-center justify-center rounded-md bg-gray-800 p-2 text-gray-400 hover:bg-gray-700 hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900">
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
                        ? 'bg-gray-800 border-red-500 text-white'
                        : 'border-transparent text-gray-400 hover:bg-gray-800 hover:border-gray-500 hover:text-white',
                      'block pl-3 pr-4 py-2 border-l-4 text-base font-medium'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.name}
                  </Disclosure.Button>
                );
              })}
              <div className="px-3 pt-4 pb-2">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-gray-500">
                  <span className="h-px flex-1 bg-gray-700" />
                  <span>Disabled</span>
                  <span className="h-px flex-1 bg-gray-700" />
                </div>
              </div>
              {disabledNavigation.map((item) => (
                <Disclosure.Button
                  key={item.name}
                  as="a"
                  href={undefined}
                  className={classNames(
                    'block pl-3 pr-4 py-2 border-l-4 text-base font-medium',
                    'border-transparent text-gray-500 cursor-not-allowed opacity-70'
                  )}
                  title="Currently disabled"
                  aria-disabled="true"
                  onClick={(event) => {
                    event.preventDefault();
                  }}
                >
                  {item.name}
                </Disclosure.Button>
              ))}
            </div>
            <div className="border-t border-gray-700 pt-4 pb-3">
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
                      <div className="text-base font-medium text-gray-200">
                        {session?.user.name}
                      </div>
                      <div className="text-sm font-medium text-gray-400">
                        {session?.user.email}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <button
                      onClick={() => signOut()}
                      className="block px-4 py-2 text-base font-medium text-gray-400 hover:bg-gray-800 hover:text-white"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-3 space-y-1">
                  <button
                    onClick={() => signIn('github')}
                    className="flex w-full px-4 py-2 text-base font-medium text-gray-400 hover:bg-gray-800 hover:text-white"
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
