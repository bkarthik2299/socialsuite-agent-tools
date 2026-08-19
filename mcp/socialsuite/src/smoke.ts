import { getClient } from './socialsuite.js';

const { client, user, orgId } = await getClient();
const { data: projects, error: projectsError } = await client
  .from('projects')
  .select('id,name,created_at')
  .limit(5);

if (projectsError) throw projectsError;

const { data: memberships, error: membershipsError } = await client
  .from('org_members')
  .select('org_id, role')
  .eq('user_id', user.id);

if (membershipsError) throw membershipsError;

console.log(JSON.stringify({
  ok: true,
  user: { id: user.id, email: user.email },
  activeOrgId: orgId,
  memberships,
  visibleProjects: projects,
}, null, 2));
