"use client";

import { useState } from "react";

interface UserListItem {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

export default function UsersList({ initialUsers }: { initialUsers: UserListItem[] }) {
  const [users] = useState(initialUsers);

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <ul role="list" className="divide-y divide-gray-200">
        {users.map((user) => (
          <li key={user.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center min-w-0 gap-4">
                <div className="flex-shrink-0">
                    <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-indigo-100 text-indigo-500 font-bold">
                        {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </span>
                </div>
                <div className="min-w-0 truncate">
                  <p className="text-sm font-medium text-indigo-600 truncate">{user.name || "Kein Name"}</p>
                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                </div>
                <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                        {user.role}
                    </span>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
