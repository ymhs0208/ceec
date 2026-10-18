import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import ts from 'typescript';

const db = new PGlite();
try {
  await db.exec(`create role anon; create role authenticated;
    create schema auth; create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table public.profiles(id uuid primary key, name text, team text);
    create table public.study_logs(user_id uuid, duration_minutes integer);`);
  await db.exec(await readFile(new URL('../supabase/migrations/202607090001_team_ranking_trends.sql', import.meta.url), 'utf8'));
  for (let i = 1; i <= 42; i++) {
    const id = `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
    await db.query('insert into public.profiles values ($1,$2,$3)', [id, `同學${i}`, `隊伍${i}`]);
    await db.query('insert into public.study_logs values ($1,$2)', [id, 1000 - i]);
  }
  const rankings = async name => (await db.query('select public.get_rankings($1) as data', [name])).rows[0].data;
  const before = await rankings('隊伍42');
  assert.equal(before.team_ranking.some(team => team.name === '隊伍42'), false, 'Reproduce the previously omitted current team');
  await rankings('僅存在查詢參數的隊伍');
  assert.equal((await db.query("select count(*)::integer as count from public.team_ranking_snapshots where team='僅存在查詢參數的隊伍'")).rows[0].count, 1, 'Reproduce query-driven snapshot pollution');
  await db.exec('truncate public.team_ranking_snapshots');
  const migration = await readFile(new URL('../supabase/migrations/202610170001_ranking_fairness.sql', import.meta.url), 'utf8');
  await db.exec(migration); await db.exec(migration);
  let result = await rankings('隊伍42');
  assert.equal(result.team_ranking.length, 31);
  assert.deepEqual(result.team_ranking.find(team => team.name === '隊伍42'), { rank: 42, name: '隊伍42', points: 958, trend: 0, isNew: false });
  await rankings('僅存在查詢參數的隊伍');
  assert.equal((await db.query("select count(*)::integer as count from public.team_ranking_snapshots where team='僅存在查詢參數的隊伍'")).rows[0].count, 0);
  assert.equal((await rankings('隊伍1')).team_ranking.length, 30);

  for (let i = 43; i <= 44; i++) {
    const id = `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
    await db.query('insert into public.profiles values ($1,$2,$3)', [id, '同分同名', `並列隊${i}`]);
    await db.query('insert into public.study_logs values ($1,2000)', [id]);
  }
  result = await rankings('隊伍42');
  assert.deepEqual(result.global_ranking.slice(0, 3).map(row => row.rank), [1, 1, 3]);
  assert.deepEqual(result.team_ranking.slice(0, 3).map(row => row.rank), [1, 1, 3]);
  assert.equal(result.team_ranking.find(team => team.name === '隊伍42').rank, 44);
  assert.deepEqual(await rankings('隊伍42'), result, 'Same names/totals must still have deterministic returned order');
  await db.query("update public.profiles set team='隊伍1' where team='隊伍2'");
  assert.equal((await rankings('隊伍1')).team_ranking.find(team => team.name === '隊伍1').points, 1997, 'Document current affiliation transfers all lifetime contribution');
  await db.exec(`insert into public.team_ranking_snapshots(snapshot_date,team,rank,points)
    values ((now() at time zone 'Asia/Taipei')::date-3,'隊伍42',50,958)`);
  assert.equal((await rankings('隊伍42')).team_ranking.find(team => team.name === '隊伍42').trend, 7, 'Use the latest past snapshot, not an invented seven-day comparison');
  for (let i = 45; i <= 64; i++) {
    const id = `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
    await db.query('insert into public.profiles values ($1,$2,$3)', [id, `同學${i}`, '']);
    await db.query('insert into public.study_logs values ($1,$2)', [id, 100 - i]);
  }
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", ['00000000-0000-4000-8000-000000000064']);
  result = await rankings('隊伍42');
  assert.equal(result.global_ranking.length, 51);
  assert.equal(result.global_ranking.find(row => row.isCurrentUser).rank, 64);
  assert.equal(result.global_ranking.find(row => row.isCurrentUser).totalMinutes, 36, 'Contribution beyond the visible leaders is not falsely shown as zero');

  // Execute the real partial-list view transform: rank 42 cannot become rank 31.
  const source = await readFile(new URL('../components/RankingBoard.tsx', import.meta.url), 'utf8');
  const ast = ts.createSourceFile('RankingBoard.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let transform, fetchHandler;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'teamRanking') transform = node.initializer.arguments[0].getText(ast);
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'fetchRanking') fetchHandler = node.initializer.getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  const compile = text => ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const view = new Function('teamRankingBackend', 'team', compile(`return (${transform})();`));
  assert.equal(view(before.team_ranking.concat({ name: '隊伍42', rank: 42, points: 958 }), '隊伍42').find(row => row.isCurrentTeam).rank, 42);
  assert.equal(view(before.team_ranking, '隊伍42').some(row => row.name === '隊伍42'), false, 'Never invent an omitted team with zero points');
  const pending = [], state = { rows: null, errors: [] }, requestRef = { current: 0 };
  const dependencies = { rankingRequestRef: requestRef, setLoading() {}, setError: value => state.errors.push(value),
    authService: { getRanking: () => new Promise(resolve => pending.push(resolve)) }, currentUser: null, team: '隊伍42', activeTab: 'team',
    setRanking: rows => { state.rows = rows; }, setTeamRankingBackend() {}, setCurrentCongrats() {}, setShowCongrats() {} };
  const fetch = new Function(...Object.keys(dependencies), compile(`return (${fetchHandler});`))(...Object.values(dependencies));
  const older = fetch(), newer = fetch();
  pending[1]({ success: true, globalRanking: [{ name: 'new', totalMinutes: 5 }], teamRanking: [] }); await newer;
  pending[0]({ success: false, message: 'stale failure' }); await older;
  assert.equal(state.rows[0].name, 'new');
  assert.equal(state.errors.includes('stale failure'), false);
  const latest = fetch(); pending[2]({ success: true, globalRanking: result.global_ranking, teamRanking: result.team_ranking }); await latest;
  assert.equal(state.rows.find(row => row.isCurrentUser).rank, 64, 'The partial response must not re-rank our user as 51');
  console.log('PASS: authoritative partial-list ranks, tied 1/1/3 rankings, stable ordering, current-team inclusion, query-only team rejection, transfer semantics, snapshot trends and stale-response protection');
} finally { await db.close(); }
