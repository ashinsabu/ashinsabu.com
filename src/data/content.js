export const meta = {
  name: 'Ashin Sabu',
  title: 'Software Engineer',
  company: 'Harness.io',
  email: 'ashin.sabu3@gmail.com',
};

const _dob = new Date(2002, 10, 10); // Nov 10 2002 (month is 0-indexed)
const _today = new Date();
const _age = _today.getFullYear() - _dob.getFullYear()
  - (_today < new Date(_today.getFullYear(), 10, 10) ? 1 : 0);

export const about = {
  paragraphs: [
    `I'm a software engineer, ${_age}, based in Bengaluru. I build distributed systems and I'm a little obsessed with understanding software at the level where abstractions give out. Go and Java in production, Rust and C++ always pulling at the edges. What actually happens in a gRPC call crossing a cluster boundary. Why a Redis Stream backpressure curve looks the way it does under load. That curiosity shapes how I work: ship the simple thing first, profile before optimizing, reach for abstraction only when not having one is genuinely expensive.`,
    "Outside of engineering, I make music and visual art. Working on a particular vocal sound. I think about building companies a lot, read wherever the interest takes me, and am currently somewhere in Zero to One.",
  ],
};

export const projects = [
  {
    id: 'licensing',
    index: '01',
    title: 'Licensing & Monetization Platform',
    deck: 'The GitOps module at Harness was free. I built the platform that changed that.',
    body: 'Licensing enforcement, usage tracking, real-time event streaming via Redis Streams and Debezium CDC, coordinated across 3 production clusters. gRPC-first with a grpc-gateway REST bridge for external consumers.',
    impact: [
      '$4–5M ARR from licensing enforcement on GitOps module',
      '12.5x scale: from 2,000 to 25,000 apps across 3 production clusters',
      'Real-time usage streaming: Redis Streams + Debezium CDC',
      'TimescaleDB for time-series usage analytics at scale',
    ],
    tags: ['go', 'redis-streams', 'mongodb', 'timescaledb', 'debezium', 'grpc', 'kubernetes'],
    status: 'Harness · Shipped',
    link: null,
  },
  {
    id: 'secrets',
    index: '02',
    title: 'Secrets Management System',
    deck: 'Enterprise secrets at scale. Distributed, auditable, bank-grade.',
    body: 'Designed and led the secrets management microservice from architecture to production. Encryption-at-rest, fine-grained RBAC, full audit trails. Mentored 3 engineers through the build.',
    impact: [
      '$2M in enterprise sales, deployed at 3 major banks',
      '200+ critical customer issues resolved ahead of SLA',
      'Encryption-at-rest, RBAC, full audit trail',
      'Led from architecture through delivery, mentored 3 engineers',
    ],
    tags: ['go', 'grpc', 'postgresql', 'kubernetes', 'spring-boot'],
    status: 'Harness · Shipped',
    link: null,
  },
  {
    id: 'monkeypox',
    index: '03',
    title: 'On-Device Disease Detection',
    deck: 'CNN running entirely in the browser. No server. No latency.',
    body: 'TensorFlow.js model for monkeypox detection that runs client-side. Inference via WebGL. Python data pipeline on GCP, deployed to Firebase Hosting.',
    impact: [
      'Client-side CNN inference with zero server cost',
      'WebGL-accelerated via TensorFlow.js',
      'Live demo at monkeypoxdetect.web.app',
    ],
    tags: ['tensorflow.js', 'react', 'python', 'firebase', 'gcp'],
    status: 'Personal · Live',
    link: 'https://monkeypoxdetect.web.app/',
  },
];

export const experience = [
  {
    company: 'Harness.io',
    role: 'Software Engineer I',
    period: 'June 2024 – Present',
    bullets: [
      'Built licensing/monetization platform for GitOps module → $4–5M ARR',
      '12.5× microservice scale (2K → 25K apps) across 3 production clusters',
      'Led secrets management system → $2M enterprise sales, 3 major banks',
      'Resolved 200+ critical customer issues ahead of SLA; mentored 3 engineers',
    ],
  },
  {
    company: 'Harness.io',
    role: 'SDE Intern',
    period: 'Aug 2023 – May 2024',
    bullets: [
      'ArgoCD (CNCF): 2 major PRs merged to main, 3 bug fixes in Go + Kubernetes',
      'Containerized deployment pipeline (Docker/OpenShift) for enterprise POC',
    ],
  },
  {
    company: 'Marvell Technology',
    role: 'SWE / FW Intern',
    period: 'May – July 2023',
    bullets: [
      'Release management dashboard for engineering leadership',
    ],
  },
];

export const awards = [
  { label: 'ICPC Regionalist', detail: '2022 Bangalore · 2023 Mathura' },
  { label: 'LeetCode Knight', detail: '1850 rating · top 5%' },
];

export const creative = {
  bio: 'Outside of distributed systems, I make music and visual art. The two practices aren\'t as separate as they seem.',
  instagramUrl: 'https://www.instagram.com/ashin.notex/',
  instagramHandle: '@ashin.notex',
};

export const contact = {
  email: 'ashin.sabu3@gmail.com',
  github: 'https://github.com/ashinsabu',
  linkedin: 'https://www.linkedin.com/in/ashin-sabu-1059a6175/',
  medium: 'https://medium.com/@ashin.sabu3',
  codeforces: 'https://codeforces.com/profile/ashin',
};

export const links = {
  resume: '/resume.pdf',
  sourceCode: 'https://github.com/ashinsabu/ashinsabu.com',
};
