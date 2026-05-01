'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Image from 'next/image';

export function TasksHeader() {
  return (
    <div className="flex-none px-8 py-6 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500 text-sm mt-1">Track, assign, and manage all project tasks across your team.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="text-right flex flex-col items-end">
              <span className="text-sm font-semibold text-gray-900 block">John Doe</span>
              <span className="text-xs text-gray-500 block">john.doe@peakroofing.com</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden relative border border-gray-100">
              <Image 
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop" 
                alt="Avatar" 
                fill
                sizes="40px"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard 
          title="Total Tasks" 
          value="128" 
          trend="+6 this month" 
          trendUp={true} 
          iconColor="bg-blue-50 text-blue-500" 
        />
        <StatCard 
          title="In Progress" 
          value="24" 
          trend="3 started today" 
          trendUp={true} 
          iconColor="bg-amber-50 text-amber-500" 
        />
        <StatCard 
          title="Overdue" 
          value="6" 
          trend="needs attention" 
          trendUp={false} 
          iconColor="bg-red-50 text-red-500" 
        />
        <StatCard 
          title="Completed" 
          value="700" 
          trend="+5 this week" 
          trendUp={true} 
          iconColor="bg-emerald-50 text-emerald-500" 
        />
      </div>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  trend, 
  trendUp, 
  iconColor 
}: { 
  title: string; 
  value: string; 
  trend: string; 
  trendUp: boolean;
  iconColor: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex items-start justify-between">
      <div>
        <h3 className="text-sm font-semibold text-gray-500 mb-2">{title}</h3>
        <div className="text-3xl font-bold text-gray-900">{value}</div>
      </div>
      <div className="flex flex-col items-end justify-between h-full min-h-[64px]">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconColor}`}>
          <div className="w-3 h-3 rounded bg-current opacity-20"></div>
          <div className="w-1.5 h-1.5 rounded-sm bg-current absolute"></div>
        </div>
        <div className={`flex items-center text-xs font-semibold mt-auto ${trendUp ? 'text-emerald-500' : 'text-red-500'}`}>
          {trendUp ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
          {trend}
        </div>
      </div>
    </div>
  );
}
