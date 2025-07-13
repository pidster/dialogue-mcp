/**
 * Knowledge graph types for representing and managing domain knowledge and relationships
 */

import { BaseEntity, UUID, ConfidenceLevel, Priority } from './common.js';

/**
 * Types of knowledge nodes in the graph
 */
export enum KnowledgeNodeType {
  ASSUMPTION = 'assumption',
  DEFINITION = 'definition',
  REQUIREMENT = 'requirement',
  CONSTRAINT = 'constraint',
  DECISION = 'decision',
  CONTRADICTION = 'contradiction',
  CONCEPT = 'concept',
  GOAL = 'goal',
  INSIGHT = 'insight',
}

/**
 * Types of relationships between knowledge nodes
 */
export enum NodeRelationshipType {
  DEPENDS_ON = 'depends_on',
  CONFLICTS_WITH = 'conflicts_with',
  SUPPORTS = 'supports',
  DERIVES_FROM = 'derives_from',
  IMPLIES = 'implies',
  CONTRADICTS = 'contradicts',
  DEFINES = 'defines',
  EXEMPLIFIES = 'exemplifies',
  ENABLES = 'enables',
  CONSTRAINS = 'constrains',
  RELATED_TO = 'related_to',
}

/**
 * Evidence supporting a knowledge claim
 */
export interface KnowledgeEvidence {
  readonly id: UUID;
  readonly type:
    | 'user_statement'
    | 'dialogue_analysis'
    | 'document_reference'
    | 'logical_inference';
  readonly source: string;
  readonly content: string;
  readonly confidence: ConfidenceLevel;
  readonly timestamp: Date;
}

/**
 * Core knowledge node in the graph
 */
export interface KnowledgeNode extends BaseEntity {
  readonly type: KnowledgeNodeType;
  readonly title: string;
  readonly content: string;
  readonly confidence: ConfidenceLevel;
  readonly source: 'user' | 'system' | 'inferred';
  readonly evidence: readonly KnowledgeEvidence[];
  readonly tags: readonly string[];
  readonly priority: Priority;
  readonly validated: boolean;
  readonly validatedBy?: 'user' | 'system';
  readonly validatedAt?: Date;
  readonly metadata: Record<string, unknown>;
}

/**
 * Relationship between two knowledge nodes
 */
export interface NodeRelationship extends BaseEntity {
  readonly fromNodeId: UUID;
  readonly toNodeId: UUID;
  readonly type: NodeRelationshipType;
  readonly description: string;
  readonly strength: ConfidenceLevel; // Strength of the relationship (0.0-1.0)
  readonly bidirectional: boolean;
  readonly evidence: readonly KnowledgeEvidence[];
  readonly detectedBy: 'user' | 'system';
  readonly validated: boolean;
}

/**
 * Contradiction detected between nodes
 */
export interface KnowledgeContradiction extends BaseEntity {
  readonly nodeIds: readonly UUID[];
  readonly relationshipIds: readonly UUID[];
  readonly description: string;
  readonly severity: Priority;
  readonly confidence: ConfidenceLevel;
  readonly resolutionStatus: 'unresolved' | 'acknowledged' | 'resolved' | 'dismissed';
  readonly resolutionNote?: string;
  readonly detectedBy: 'user' | 'system';
  readonly detectionReason: string;
}

/**
 * Consistency rule for validating knowledge integrity
 */
export interface ConsistencyRule {
  readonly id: UUID;
  readonly name: string;
  readonly description: string;
  readonly ruleType: 'logical' | 'domain_specific' | 'temporal' | 'cardinality';
  readonly pattern: {
    readonly nodeTypes: readonly KnowledgeNodeType[];
    readonly relationshipTypes: readonly NodeRelationshipType[];
    readonly condition: string; // Logical expression or pattern
  };
  readonly violationSeverity: Priority;
  readonly enabled: boolean;
}

/**
 * Knowledge graph traversal path
 */
export interface GraphPath {
  readonly nodes: readonly UUID[];
  readonly relationships: readonly UUID[];
  readonly length: number;
  readonly totalWeight: number;
  readonly pathType: 'dependency' | 'support' | 'conflict' | 'derivation';
}

/**
 * Graph analysis result
 */
export interface GraphAnalysis {
  readonly nodeCount: number;
  readonly relationshipCount: number;
  readonly contradictionCount: number;
  readonly strongestConnections: readonly NodeRelationship[];
  readonly isolatedNodes: readonly UUID[];
  readonly criticalPaths: readonly GraphPath[];
  readonly consistencyScore: ConfidenceLevel;
  readonly analysisTimestamp: Date;
}

/**
 * Knowledge cluster (group of related nodes)
 */
export interface KnowledgeCluster {
  readonly id: UUID;
  readonly name: string;
  readonly nodeIds: readonly UUID[];
  readonly centralNodeId: UUID; // Most connected node in cluster
  readonly coherenceScore: ConfidenceLevel;
  readonly clusterType:
    | 'assumption_group'
    | 'requirement_set'
    | 'decision_chain'
    | 'concept_family';
}

/**
 * Graph query parameters
 */
export interface GraphQuery {
  readonly nodeTypes?: readonly KnowledgeNodeType[];
  readonly relationshipTypes?: readonly NodeRelationshipType[];
  readonly tags?: readonly string[];
  readonly sessionId?: UUID;
  readonly confidence?: {
    readonly min?: ConfidenceLevel;
    readonly max?: ConfidenceLevel;
  };
  readonly textSearch?: string;
  readonly startNodeId?: UUID;
  readonly maxDepth?: number;
  readonly includeEvidence?: boolean;
}

/**
 * Graph update operation
 */
export interface GraphUpdate {
  readonly operation:
    | 'add_node'
    | 'update_node'
    | 'delete_node'
    | 'add_relationship'
    | 'update_relationship'
    | 'delete_relationship';
  readonly target: UUID;
  readonly data?: Partial<KnowledgeNode | NodeRelationship>;
  readonly reason: string;
  readonly performedBy: 'user' | 'system';
  readonly timestamp: Date;
}

/**
 * Knowledge extraction result from dialogue
 */
export interface KnowledgeExtraction {
  readonly sourceText: string;
  readonly extractedNodes: readonly Partial<KnowledgeNode>[];
  readonly extractedRelationships: readonly Partial<NodeRelationship>[];
  readonly confidence: ConfidenceLevel;
  readonly extractionMethod: 'pattern_matching' | 'nlp_analysis' | 'rule_based' | 'user_annotation';
  readonly requiresValidation: boolean;
}

/**
 * Graph metrics for monitoring health
 */
export interface GraphMetrics {
  readonly totalNodes: Record<KnowledgeNodeType, number>;
  readonly totalRelationships: Record<NodeRelationshipType, number>;
  readonly averageNodeConnectivity: number;
  readonly contradictionRate: number;
  readonly validationRate: number;
  readonly lastUpdated: Date;
}
