'use client';

import React from 'react';
import Image from 'next/image';

export function TimelineTab() {
  // A simplified, static rendering of the timeline from the mockup
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 m-6 shadow-sm overflow-x-auto">
      <div className="flex items-center justify-between mb-8 min-w-[800px]">
        <h3 className="text-lg font-bold text-gray-900">Project Timeline (12 Weeks)</h3>
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          <button className="px-3 py-1.5 rounded text-sm text-gray-500 hover:text-gray-900">Day</button>
          <button className="px-3 py-1.5 rounded text-sm bg-white font-medium shadow-sm">Week</button>
          <button className="px-3 py-1.5 rounded text-sm text-gray-500 hover:text-gray-900">Month</button>
        </div>
      </div>

      <div className="min-w-[800px] relative border-t border-gray-100">
        
        {/* Months header */}
        <div className="flex border-b border-gray-100 text-xs font-semibold text-gray-500 py-3">
          <div className="flex-1 text-center border-r border-gray-100">February</div>
          <div className="flex-1 text-center border-r border-gray-100">March</div>
          <div className="flex-1 text-center">April</div>
        </div>

        {/* Weeks header */}
        <div className="flex border-b border-gray-100 text-xs text-gray-400 py-2">
          {Array.from({length: 12}).map((_, i) => (
            <div key={i} className="flex-1 text-center border-r border-gray-100 last:border-0 border-dashed">
              W{i + 1}
            </div>
          ))}
        </div>

        {/* Timeline Grid & Content */}
        <div className="relative pt-6 pb-20">
          {/* Vertical grid lines */}
          <div className="absolute inset-0 flex">
            {Array.from({length: 12}).map((_, i) => (
              <div key={i} className="flex-1 border-r border-gray-100 border-dashed last:border-0"></div>
            ))}
          </div>

          {/* Current day line */}
          <div className="absolute top-0 bottom-0 left-[62%] border-l-2 border-indigo-500 z-10 w-0"></div>

          {/* Phase 1 */}
          <div className="relative z-20 mb-6">
             <div className="text-xs font-semibold text-orange-500 mb-2 pl-4">◆ Phase One</div>
             <div className="relative h-14">
               {/* Roofing block 1 */}
               <div className="absolute left-[0%] w-[16%] h-full bg-orange-500 rounded-md p-2 text-white overflow-hidden shadow-sm hover:ring-2 ring-orange-300 transition-all cursor-pointer">
                 <h4 className="text-xs font-bold whitespace-nowrap">Roofing</h4>
                 <p className="text-[10px] text-orange-100 mb-1 whitespace-nowrap">Fixing woods & metals</p>
               </div>

               {/* Roofing block 2 */}
               <div className="absolute left-[25%] w-[16%] h-full bg-orange-500 rounded-md p-2 text-white overflow-hidden shadow-sm hover:ring-2 ring-orange-300 transition-all cursor-pointer">
                 <h4 className="text-xs font-bold whitespace-nowrap">Roofing</h4>
                 <p className="text-[10px] text-orange-100 mb-1 whitespace-nowrap">Fixing woods & metals</p>
               </div>
               
               {/* Roofing block 3 */}
               <div className="absolute left-[50%] w-[16%] h-full bg-orange-500 rounded-md p-2 text-white overflow-hidden shadow-sm hover:ring-2 ring-orange-300 transition-all cursor-pointer">
                 <h4 className="text-xs font-bold whitespace-nowrap">Roofing</h4>
                 <p className="text-[10px] text-orange-100 mb-1 whitespace-nowrap">Fixing woods & metals</p>
               </div>
             </div>
          </div>

          {/* Phase 2 */}
          <div className="relative z-20">
             <div className="text-xs font-semibold text-purple-600 mb-2 pl-[59%]">◆ Phase 2</div>
             <div className="relative h-14">
               {/* Installing block 1 */}
               <div className="absolute left-[58%] w-[15%] h-full bg-[#9900FF] rounded-md p-2 text-white overflow-hidden shadow-sm hover:ring-2 ring-purple-300 transition-all cursor-pointer">
                 <h4 className="text-xs font-bold whitespace-nowrap">Installing</h4>
                 <p className="text-[10px] text-purple-200 mb-1 whitespace-nowrap">Installing metal sheet</p>
               </div>

               {/* Installing block 2 */}
               <div className="absolute left-[75%] w-[25%] h-full bg-[#9900FF] rounded-md p-2 text-white overflow-hidden shadow-sm hover:ring-2 ring-purple-300 transition-all cursor-pointer">
                 <h4 className="text-xs font-bold whitespace-nowrap">Installing</h4>
                 <p className="text-[10px] text-purple-200 mb-1 whitespace-nowrap">Installing metal sheet</p>
               </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
