import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Live Messages & Pair-Hacking | NerdShive',
  description: 'Connect with developers in persistent squad rooms, voice lounges, and pair-programming video stages.',
};

export default function StrangerChatRedirectPage() {
  // Redirect legacy roulette traffic to real, reliable squad rooms & direct messages
  redirect('/dashboard/messages');
}
