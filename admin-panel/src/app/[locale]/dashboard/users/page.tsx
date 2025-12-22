import UsersPageContent from '@/components/UsersPageContent';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Users - GateFlow Admin',
};

export default function UsersPage() {
  return <UsersPageContent />;
}