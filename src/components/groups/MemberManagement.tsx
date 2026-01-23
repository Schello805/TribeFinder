"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import ObfuscatedEmail from "@/components/ui/ObfuscatedEmail";
import { normalizeUploadedImageUrl } from "@/lib/normalizeUploadedImageUrl";

interface User {
  id: string;
  name: string | null;
  image: string | null;
  email: string;
}

interface Member {
  id: string;
  role: string;
  status: string;
  user: User;
}

interface MemberManagementProps {
  groupId: string;
  members: Member[];
  currentUserId: string;
}

export default function MemberManagement({ groupId, members: initialMembers, currentUserId }: MemberManagementProps) {
  const { showToast } = useToast();
  const [members, setMembers] = useState(initialMembers);
  const [isLoading, setIsLoading] = useState<string | null>(null); // ID of member being processed

  const pendingMembers = members.filter(m => m.status === 'PENDING');
  const approvedMembers = members.filter(m => m.status === 'APPROVED');

  const handleAction = async (userId: string, action: 'approve' | 'reject' | 'remove' | 'promote' | 'demote') => {
    setIsLoading(userId);
    try {
      if (action === 'remove' || action === 'reject') {
        const response = await fetch(`/api/groups/${groupId}/members?userId=${userId}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          setMembers(prev => prev.filter(m => m.user.id !== userId));
          showToast(action === 'remove' ? 'Mitglied entfernt' : 'Anfrage abgelehnt', 'success');
        } else {
            const data = await response.json();
            showToast(data.message || "Fehler beim Entfernen", 'error');
        }
      } else if (action === 'approve') {
        const response = await fetch(`/api/groups/${groupId}/members`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, action: 'approve' })
        });

        if (response.ok) {
            setMembers(prev => prev.map(m => m.user.id === userId ? { ...m, status: 'APPROVED' } : m));
            showToast('Mitglied genehmigt', 'success');
        } else {
            const data = await response.json();
            showToast(data.message || "Fehler beim Genehmigen", 'error');
        }
      } else if (action === 'promote') {
          const response = await fetch(`/api/groups/${groupId}/members`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, action: 'update_role', role: 'ADMIN' })
        });
        if (response.ok) {
            setMembers(prev => prev.map(m => m.user.id === userId ? { ...m, role: 'ADMIN' } : m));
            showToast('Zum Admin befördert', 'success');
        }
      } else if (action === 'demote') {
          const response = await fetch(`/api/groups/${groupId}/members`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, action: 'update_role', role: 'MEMBER' })
        });
        if (response.ok) {
            setMembers(prev => prev.map(m => m.user.id === userId ? { ...m, role: 'MEMBER' } : m));
            showToast('Zum Mitglied zurückgestuft', 'info');
        }
      }
    } catch (error) {
      console.error("Error managing member:", error);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Pending Requests */}
      {pendingMembers.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-100 dark:border-yellow-800 p-6">
          <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-200 mb-4 flex items-center gap-2">
            <span>🔔</span> Beitrittsanfragen ({pendingMembers.length})
          </h3>
          <ul className="space-y-4">
            {pendingMembers.map(member => (
              <li key={member.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  {member.user.image ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={normalizeUploadedImageUrl(member.user.image) ?? ""} alt={member.user.name || "User"} className="w-10 h-10 rounded-full object-cover" />
                    </>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 font-bold">
                      {member.user.name?.charAt(0) || "?"}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{member.user.name || "Unbekannt"}</p>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        <ObfuscatedEmail email={member.user.email} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(member.user.id, 'approve')}
                    disabled={isLoading === member.user.id}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    Annehmen
                  </button>
                  <button
                    onClick={() => handleAction(member.user.id, 'reject')}
                    disabled={isLoading === member.user.id}
                    className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 text-sm font-medium rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
                  >
                    Ablehnen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Member List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span>👥</span> Mitglieder ({approvedMembers.length})
        </h3>
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {approvedMembers.map(member => (
            <li key={member.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                 {member.user.image ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={normalizeUploadedImageUrl(member.user.image) ?? ""} alt={member.user.name || "User"} className="w-10 h-10 rounded-full object-cover" />
                    </>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 font-bold">
                      {member.user.name?.charAt(0) || "?"}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      {member.user.name || "Unbekannt"}
                      {member.role === 'ADMIN' && (
                        <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">Admin</span>
                      )}
                    </p>
                     <div className="text-sm text-gray-500 dark:text-gray-400">
                        <ObfuscatedEmail email={member.user.email} />
                    </div>
                  </div>
              </div>

              {/* Actions - don't show for self */}
              {member.user.id !== currentUserId && (
                <div className="flex items-center gap-2">
                  {member.role === 'MEMBER' ? (
                     <button
                        onClick={() => handleAction(member.user.id, 'promote')}
                        disabled={isLoading === member.user.id}
                        className="text-xs text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200 font-medium px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                        title="Zum Admin befördern"
                      >
                        ↑ Admin
                      </button>
                  ) : (
                      <button
                        onClick={() => handleAction(member.user.id, 'demote')}
                        disabled={isLoading === member.user.id}
                        className="text-xs text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 font-medium px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                        title="Admin-Rechte entziehen"
                      >
                        ↓ Member
                      </button>
                  )}
                  
                  <button
                    onClick={() => {
                        if(confirm('Möchtest du dieses Mitglied wirklich entfernen?')) {
                            handleAction(member.user.id, 'remove');
                        }
                    }}
                    disabled={isLoading === member.user.id}
                    className="text-xs text-red-600 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200 font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                  >
                    Entfernen
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
