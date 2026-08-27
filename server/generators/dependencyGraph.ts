import type { GeneratorKind } from "./commonGeneratorApi";

export const DEPENDENCY_GRAPH_SCHEMA_VERSION = "a-survival.dependency-graph.v1" as const;

export type GeneratorDependency = {
  key: string;
  kind: GeneratorKind;
  required: boolean;
  generatorId?: string;
  compatibleVersions?: string[];
  generatorVersion?: string;
  contentHash?: string;
};

export type DependencyGraphNode = {
  key: string;
  kind: GeneratorKind;
  generatorId: string;
  generatorVersion: string;
  schemaVersion: string;
  seed: string;
  rulesVersion: string;
  contentHash: string;
  dependencies: GeneratorDependency[];
};

export type DependencyGraphIssue = {
  code: "DUPLICATE_NODE" | "DUPLICATE_DEPENDENCY" | "MISSING_REQUIRED_DEPENDENCY" | "DEPENDENCY_KIND_MISMATCH" | "DEPENDENCY_GENERATOR_MISMATCH" | "DEPENDENCY_VERSION_INCOMPATIBLE" | "DEPENDENCY_HASH_MISMATCH" | "CYCLE";
  key: string;
  dependencyKey?: string;
  detail: string;
};

export type DependencyGraphValidation = {
  schemaVersion: typeof DEPENDENCY_GRAPH_SCHEMA_VERSION;
  valid: boolean;
  issues: DependencyGraphIssue[];
  nodes: DependencyGraphNode[];
  edges: Array<{ from: string; to: string; required: boolean }>;
  topologicalOrder: string[];
  runtimePolicy: { runtimeImportAllowed: false; playerVisible: false; cacheable: false };
};

function compareStrings(left: string, right: string) {
  return left.localeCompare(right);
}

function cloneDependency(dependency: GeneratorDependency): GeneratorDependency {
  return {
    ...dependency,
    ...(dependency.compatibleVersions ? { compatibleVersions: [...dependency.compatibleVersions].sort(compareStrings) } : {}),
  };
}

function cloneNode(node: DependencyGraphNode): DependencyGraphNode {
  return {
    ...node,
    dependencies: [...node.dependencies].map(cloneDependency).sort((left, right) => compareStrings(left.key, right.key)),
  };
}

function pushIssue(issues: DependencyGraphIssue[], issue: DependencyGraphIssue) {
  if (!issues.some(existing => existing.code === issue.code && existing.key === issue.key && existing.dependencyKey === issue.dependencyKey && existing.detail === issue.detail)) issues.push(issue);
}

export function validateGeneratorDependencyGraph(input: readonly DependencyGraphNode[]): DependencyGraphValidation {
  const nodes = [...input].map(cloneNode).sort((left, right) => compareStrings(left.key, right.key));
  const issues: DependencyGraphIssue[] = [];
  const nodeByKey = new Map<string, DependencyGraphNode>();
  for (const node of nodes) {
    if (nodeByKey.has(node.key)) {
      pushIssue(issues, { code: "DUPLICATE_NODE", key: node.key, detail: `Dependency graph node is duplicated: ${node.key}` });
      continue;
    }
    nodeByKey.set(node.key, node);
  }

  const edges: Array<{ from: string; to: string; required: boolean }> = [];
  for (const node of nodes) {
    const dependencyKeys = new Set<string>();
    for (const dependency of node.dependencies) {
      if (dependencyKeys.has(dependency.key)) {
        pushIssue(issues, { code: "DUPLICATE_DEPENDENCY", key: node.key, dependencyKey: dependency.key, detail: `Dependency is duplicated: ${node.key} → ${dependency.key}` });
        continue;
      }
      dependencyKeys.add(dependency.key);
      const target = nodeByKey.get(dependency.key);
      if (!target) {
        if (dependency.required) pushIssue(issues, { code: "MISSING_REQUIRED_DEPENDENCY", key: node.key, dependencyKey: dependency.key, detail: `Required dependency is missing: ${node.key} → ${dependency.key}` });
        continue;
      }
      edges.push({ from: dependency.key, to: node.key, required: dependency.required });
      if (target.kind !== dependency.kind) pushIssue(issues, { code: "DEPENDENCY_KIND_MISMATCH", key: node.key, dependencyKey: dependency.key, detail: `Dependency kind mismatch for ${dependency.key}: expected ${dependency.kind}, found ${target.kind}` });
      if (dependency.generatorId && target.generatorId !== dependency.generatorId) pushIssue(issues, { code: "DEPENDENCY_GENERATOR_MISMATCH", key: node.key, dependencyKey: dependency.key, detail: `Dependency generator mismatch for ${dependency.key}: expected ${dependency.generatorId}, found ${target.generatorId}` });
      if (dependency.compatibleVersions && !dependency.compatibleVersions.includes(target.generatorVersion)) pushIssue(issues, { code: "DEPENDENCY_VERSION_INCOMPATIBLE", key: node.key, dependencyKey: dependency.key, detail: `Dependency version is incompatible for ${dependency.key}: ${target.generatorVersion}` });
      if (dependency.generatorVersion && target.generatorVersion !== dependency.generatorVersion) pushIssue(issues, { code: "DEPENDENCY_VERSION_INCOMPATIBLE", key: node.key, dependencyKey: dependency.key, detail: `Dependency version mismatch for ${dependency.key}: expected ${dependency.generatorVersion}, found ${target.generatorVersion}` });
      if (dependency.contentHash && target.contentHash !== dependency.contentHash) pushIssue(issues, { code: "DEPENDENCY_HASH_MISMATCH", key: node.key, dependencyKey: dependency.key, detail: `Dependency content hash mismatch for ${dependency.key}` });
    }
  }

  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    const dependents = outgoing.get(edge.from) ?? [];
    dependents.push(edge.to);
    outgoing.set(edge.from, dependents);
  }
  for (const dependents of Array.from(outgoing.values())) dependents.sort(compareStrings);

  const visitState = new Map<string, "visiting" | "visited">();
  const stack: string[] = [];
  const visit = (key: string) => {
    const state = visitState.get(key);
    if (state === "visiting") {
      const cycleStart = stack.indexOf(key);
      const cycle = [...stack.slice(cycleStart), key];
      pushIssue(issues, { code: "CYCLE", key, detail: `Dependency graph contains a cycle: ${cycle.join(" → ")}` });
      return;
    }
    if (state === "visited") return;
    visitState.set(key, "visiting");
    stack.push(key);
    for (const dependent of outgoing.get(key) ?? []) visit(dependent);
    stack.pop();
    visitState.set(key, "visited");
  };
  for (const node of nodes) visit(node.key);

  const indegree = new Map(nodes.map(node => [node.key, 0]));
  for (const edge of edges) indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
  const ready = nodes.filter(node => indegree.get(node.key) === 0).map(node => node.key).sort(compareStrings);
  const topologicalOrder: string[] = [];
  while (ready.length > 0) {
    const key = ready.shift()!;
    topologicalOrder.push(key);
    for (const dependent of outgoing.get(key) ?? []) {
      const next = (indegree.get(dependent) ?? 0) - 1;
      indegree.set(dependent, next);
      if (next === 0) {
        ready.push(dependent);
        ready.sort(compareStrings);
      }
    }
  }

  return {
    schemaVersion: DEPENDENCY_GRAPH_SCHEMA_VERSION,
    valid: issues.length === 0,
    issues,
    nodes,
    edges: edges.sort((left, right) => compareStrings(left.from, right.from) || compareStrings(left.to, right.to)),
    topologicalOrder,
    runtimePolicy: { runtimeImportAllowed: false, playerVisible: false, cacheable: false },
  };
}
