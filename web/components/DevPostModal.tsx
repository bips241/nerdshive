'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import ShipLogUI from './dev-posts/ShipLogUI';
import CodeSosUI from './dev-posts/CodeSosUI';
import ArchitectureRfcUI from './dev-posts/ArchitectureRfcUI';
import HackathonCrewUI from './dev-posts/HackathonCrewUI';
import TechShowdownUI from './dev-posts/TechShowdownUI';
import PollPostUI from './PollPostUI';
import ProjectPostUI from './ProjectPostUI';
import GoalPostUI from './GoalPostUI';

export const DevPostModal: React.FC<{ post: any }> = ({ post }) => {
  const router = useRouter();

  const renderContent = () => {
    switch (post.postType) {
      case 'ship_log':
        return <ShipLogUI post={post} />;
      case 'code_sos':
        return <CodeSosUI post={post} />;
      case 'architecture_rfc':
        return <ArchitectureRfcUI post={post} />;
      case 'hackathon_crew':
        return <HackathonCrewUI post={post} />;
      case 'tech_showdown':
        return <TechShowdownUI post={post} />;
      case 'poll':
        return <PollPostUI post={post} />;
      case 'project':
        return <ProjectPostUI post={post} />;
      case 'goal':
        return <GoalPostUI post={post} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && router.back()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-2 sm:p-4 bg-background border-border text-foreground">
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default DevPostModal;
