/**
 * Response analyzer for extracting insights from user responses to dialogue questions
 */

import {
  PatternType,
  ResponseAnalysis,
  QuestionContext,
  GeneratedQuestion,
} from '../types/patterns.js';
import { ConfidenceLevel, ContextCategory } from '../types/common.js';
import { PatternLibrary } from '../patterns/PatternLibrary.js';

/**
 * Analysis configuration
 */
export interface AnalysisConfig {
  readonly enableDeepAnalysis: boolean;
  readonly extractionThreshold: ConfidenceLevel;
  readonly maxConcepts: number;
  readonly maxAssumptions: number;
  readonly maxContradictions: number;
  readonly contextSensitive: boolean;
}

/**
 * Insight extraction result
 */
export interface InsightExtraction {
  readonly type: 'concept' | 'assumption' | 'contradiction' | 'requirement' | 'constraint';
  readonly content: string;
  readonly confidence: ConfidenceLevel;
  readonly source: 'explicit' | 'implicit' | 'inferred';
  readonly context: string;
  readonly relatedPatterns: readonly PatternType[];
}

/**
 * Response characteristics analysis
 */
export interface ResponseCharacteristics {
  readonly length: number;
  readonly complexity: ConfidenceLevel;
  readonly specificity: ConfidenceLevel;
  readonly emotionalTone: 'neutral' | 'positive' | 'negative' | 'uncertain' | 'confident';
  readonly technicality: ConfidenceLevel;
  readonly defensiveness: ConfidenceLevel;
  readonly engagement: ConfidenceLevel;
}

/**
 * Follow-up recommendations
 */
export interface FollowUpRecommendation {
  readonly pattern: PatternType;
  readonly priority: ConfidenceLevel;
  readonly reason: string;
  readonly targetInsight: string;
  readonly contextVariables: Record<string, string>;
}

/**
 * Comprehensive analysis result
 */
export interface ComprehensiveAnalysis extends ResponseAnalysis {
  readonly characteristics: ResponseCharacteristics;
  readonly insights: readonly InsightExtraction[];
  readonly followUpRecommendations: readonly FollowUpRecommendation[];
  readonly qualityMetrics: {
    readonly completeness: ConfidenceLevel;
    readonly depth: ConfidenceLevel;
    readonly relevance: ConfidenceLevel;
    readonly actionability: ConfidenceLevel;
  };
}

/**
 * Response analyzer for extracting insights and determining follow-ups
 */
export class ResponseAnalyzer {
  private readonly patternLibrary: PatternLibrary;
  private readonly config: AnalysisConfig;

  constructor(patternLibrary: PatternLibrary, config?: Partial<AnalysisConfig>) {
    this.patternLibrary = patternLibrary;
    this.config = {
      enableDeepAnalysis: true,
      extractionThreshold: 0.6,
      maxConcepts: 10,
      maxAssumptions: 5,
      maxContradictions: 3,
      contextSensitive: true,
      ...config,
    };

    // Initialize pattern library for future advanced analysis
    void this.patternLibrary;
  }

  /**
   * Analyze a user response comprehensively
   */
  public analyzeResponse(
    question: GeneratedQuestion,
    response: string,
    context: QuestionContext
  ): ComprehensiveAnalysis {
    const baseAnalysis = this.performBaseAnalysis(question, response);
    const characteristics = this.analyzeCharacteristics(response, context);
    const insights = this.extractInsights(response, question, context);
    const followUpRecommendations = this.generateFollowUpRecommendations(
      insights,
      question,
      context,
      characteristics
    );
    const qualityMetrics = this.calculateQualityMetrics(response, insights, characteristics);

    return {
      ...baseAnalysis,
      characteristics,
      insights,
      followUpRecommendations,
      qualityMetrics,
    };
  }

  /**
   * Extract specific type of insight from response
   */
  public extractInsightType(
    response: string,
    type: 'concept' | 'assumption' | 'contradiction' | 'requirement' | 'constraint',
    context?: QuestionContext
  ): readonly InsightExtraction[] {
    switch (type) {
      case 'concept':
        return this.extractConcepts(response, context);
      case 'assumption':
        return this.extractAssumptions(response, context);
      case 'contradiction':
        return this.extractContradictions(response, context);
      case 'requirement':
        return this.extractRequirements(response, context);
      case 'constraint':
        return this.extractConstraints(response, context);
      default:
        return [];
    }
  }

  /**
   * Analyze response quality
   */
  public analyzeQuality(
    response: string,
    expectedType: string
  ): {
    clarity: ConfidenceLevel;
    completeness: ConfidenceLevel;
    depth: ConfidenceLevel;
    relevance: ConfidenceLevel;
  } {
    const clarity = this.calculateClarity(response);
    const completeness = this.calculateCompleteness(response, expectedType);
    const depth = this.calculateDepth(response);
    const relevance = this.calculateRelevance(response, expectedType);

    return { clarity, completeness, depth, relevance };
  }

  /**
   * Perform base analysis using existing interface
   */
  private performBaseAnalysis(question: GeneratedQuestion, response: string): ResponseAnalysis {
    const extractedConcepts = this.extractConcepts(response).map(e => e.content);
    const detectedAssumptions = this.extractAssumptions(response).map(e => e.content);
    const identifiedContradictions = this.extractContradictions(response).map(e => e.content);

    const clarityScore = this.calculateClarity(response);
    const completenessScore = this.calculateCompleteness(response, question.expectedResponseType);

    const suggestedFollowUps = this.suggestFollowUpPatterns(
      question.patternType,
      extractedConcepts,
      detectedAssumptions,
      identifiedContradictions
    );

    // Simple insight detection
    const newInsights: string[] = [];
    if (extractedConcepts.length > 0) newInsights.push('concept identified');
    if (detectedAssumptions.length > 0) newInsights.push('assumption surfaced');
    if (identifiedContradictions.length > 0) newInsights.push('contradiction found');

    return {
      questionId: question.id,
      response,
      analyzedAt: new Date(),
      extractedConcepts,
      detectedAssumptions,
      identifiedContradictions,
      clarityScore,
      completenessScore,
      suggestedFollowUps,
      newInsights,
    };
  }

  /**
   * Analyze response characteristics
   */
  private analyzeCharacteristics(
    response: string,
    context: QuestionContext
  ): ResponseCharacteristics {
    const length = response.length;
    const complexity = this.calculateComplexity(response);
    const specificity = this.calculateSpecificity(response);
    const emotionalTone = this.detectEmotionalTone(response);
    const technicality = this.calculateTechnicality(response, context);
    const defensiveness = this.detectDefensiveness(response);
    const engagement = this.calculateEngagement(response);

    return {
      length,
      complexity,
      specificity,
      emotionalTone,
      technicality,
      defensiveness,
      engagement,
    };
  }

  /**
   * Extract insights comprehensively
   */
  private extractInsights(
    response: string,
    _question: GeneratedQuestion,
    context: QuestionContext
  ): readonly InsightExtraction[] {
    const insights: InsightExtraction[] = [];

    // Extract different types of insights
    insights.push(...this.extractConcepts(response, context));
    insights.push(...this.extractAssumptions(response, context));
    insights.push(...this.extractContradictions(response, context));
    insights.push(...this.extractRequirements(response, context));
    insights.push(...this.extractConstraints(response, context));

    // Filter by confidence threshold
    const filteredInsights = insights.filter(
      insight => insight.confidence >= this.config.extractionThreshold
    );

    // Limit results and prioritize by confidence
    return filteredInsights
      .sort((a, b) => b.confidence - a.confidence)
      .slice(
        0,
        this.config.maxConcepts + this.config.maxAssumptions + this.config.maxContradictions
      );
  }

  /**
   * Extract concepts from response
   */
  private extractConcepts(
    response: string,
    _context?: QuestionContext
  ): readonly InsightExtraction[] {
    const concepts: InsightExtraction[] = [];

    // Technical terms and domain concepts
    const technicalPatterns = [
      /\b(api|database|server|client|service|component|module|framework|library|algorithm|interface|protocol)\b/gi,
      /\b[A-Z][a-z]+(Service|Controller|Manager|Handler|Provider|Engine|Factory|Builder)\b/g,
      /\b\w+ing\b/g, // Gerunds often represent concepts/processes
      /\b[A-Z]{2,}\b/g, // Acronyms
    ];

    for (const pattern of technicalPatterns) {
      const matches = response.match(pattern) || [];
      for (const match of matches) {
        if (match.length > 2) {
          // Filter out very short matches
          concepts.push({
            type: 'concept',
            content: match.trim(),
            confidence: this.calculateConceptConfidence(match, response, _context),
            source: 'explicit',
            context: this.extractSurroundingContext(response, match),
            relatedPatterns: [PatternType.DEFINITION_SEEKING, PatternType.CONCEPTUAL_CLARITY],
          });
        }
      }
    }

    // Domain-specific concepts based on context
    if (_context?.currentFocus) {
      const focusRelatedConcepts = this.extractFocusRelatedConcepts(
        response,
        _context.currentFocus
      );
      concepts.push(...focusRelatedConcepts);
    }

    return this.deduplicateInsights(concepts).slice(0, this.config.maxConcepts);
  }

  /**
   * Extract assumptions from response
   */
  private extractAssumptions(
    response: string,
    _context?: QuestionContext
  ): readonly InsightExtraction[] {
    const assumptions: InsightExtraction[] = [];

    // Explicit assumption indicators
    const assumptionPatterns = [
      /(?:assume|assuming|presumably|obviously|clearly|naturally|of course|everyone knows).*?[.!?]/gi,
      /(?:it's (?:clear|obvious) that|we all know that|it goes without saying).*?[.!?]/gi,
      /(?:since|given that|because).*?[.!?]/gi,
    ];

    for (const pattern of assumptionPatterns) {
      const matches = response.match(pattern) || [];
      for (const match of matches) {
        assumptions.push({
          type: 'assumption',
          content: match.trim(),
          confidence: this.calculateAssumptionConfidence(match, response),
          source: 'explicit',
          context: this.extractSurroundingContext(response, match),
          relatedPatterns: [PatternType.ASSUMPTION_EXCAVATION, PatternType.CONSISTENCY_TESTING],
        });
      }
    }

    // Implicit assumptions (statements taken as fact without justification)
    const implicitAssumptions = this.extractImplicitAssumptions(response);
    assumptions.push(...implicitAssumptions);

    return this.deduplicateInsights(assumptions).slice(0, this.config.maxAssumptions);
  }

  /**
   * Extract contradictions from response
   */
  private extractContradictions(
    response: string,
    _context?: QuestionContext
  ): readonly InsightExtraction[] {
    const contradictions: InsightExtraction[] = [];

    // Direct contradiction indicators
    const contradictionPatterns = [
      /(?:but|however|although|though|on the other hand|conversely).*?[.!?]/gi,
      /(?:can't|cannot).*?(?:but|yet|still).*?[.!?]/gi,
      /(?:not|never|no).*?(?:but|yet|however).*?[.!?]/gi,
    ];

    for (const pattern of contradictionPatterns) {
      const matches = response.match(pattern) || [];
      for (const match of matches) {
        contradictions.push({
          type: 'contradiction',
          content: match.trim(),
          confidence: this.calculateContradictionConfidence(match, response),
          source: 'explicit',
          context: this.extractSurroundingContext(response, match),
          relatedPatterns: [PatternType.CONSISTENCY_TESTING, PatternType.NECESSITY_TESTING],
        });
      }
    }

    // Analyze for logical inconsistencies
    const logicalContradictions = this.findLogicalContradictions(response);
    contradictions.push(...logicalContradictions);

    return this.deduplicateInsights(contradictions).slice(0, this.config.maxContradictions);
  }

  /**
   * Extract requirements from response
   */
  private extractRequirements(
    response: string,
    _context?: QuestionContext
  ): readonly InsightExtraction[] {
    const requirements: InsightExtraction[] = [];

    const requirementPatterns = [
      /(?:must|should|need to|have to|required to|necessary to).*?[.!?]/gi,
      /(?:requirement|specification|criteria|standard).*?[.!?]/gi,
      /(?:in order to|so that).*?[.!?]/gi,
    ];

    for (const pattern of requirementPatterns) {
      const matches = response.match(pattern) || [];
      for (const match of matches) {
        requirements.push({
          type: 'requirement',
          content: match.trim(),
          confidence: this.calculateRequirementConfidence(match, response),
          source: 'explicit',
          context: this.extractSurroundingContext(response, match),
          relatedPatterns: [PatternType.NECESSITY_TESTING, PatternType.CONCRETE_INSTANTIATION],
        });
      }
    }

    return this.deduplicateInsights(requirements).slice(0, 5);
  }

  /**
   * Extract constraints from response
   */
  private extractConstraints(
    response: string,
    _context?: QuestionContext
  ): readonly InsightExtraction[] {
    const constraints: InsightExtraction[] = [];

    const constraintPatterns = [
      /(?:can't|cannot|unable to|limited by|constrained by|restricted by).*?[.!?]/gi,
      /(?:budget|time|resource|performance|security|legal).*?(?:limit|constraint|restriction).*?[.!?]/gi,
      /(?:within|under|less than|maximum|minimum).*?[.!?]/gi,
    ];

    for (const pattern of constraintPatterns) {
      const matches = response.match(pattern) || [];
      for (const match of matches) {
        constraints.push({
          type: 'constraint',
          content: match.trim(),
          confidence: this.calculateConstraintConfidence(match, response),
          source: 'explicit',
          context: this.extractSurroundingContext(response, match),
          relatedPatterns: [PatternType.NECESSITY_TESTING, PatternType.IMPACT_ANALYSIS],
        });
      }
    }

    return this.deduplicateInsights(constraints).slice(0, 5);
  }

  /**
   * Generate follow-up recommendations based on insights
   */
  private generateFollowUpRecommendations(
    insights: readonly InsightExtraction[],
    _question: GeneratedQuestion,
    context: QuestionContext,
    characteristics: ResponseCharacteristics
  ): readonly FollowUpRecommendation[] {
    const recommendations: FollowUpRecommendation[] = [];

    // Pattern-specific follow-ups based on insights
    for (const insight of insights) {
      const followUps = this.getPatternSpecificFollowUps(
        insight,
        _question.patternType,
        characteristics
      );
      recommendations.push(...followUps);
    }

    // Context-driven recommendations
    const contextRecommendations = this.getContextDrivenRecommendations(
      context,
      characteristics,
      insights
    );
    recommendations.push(...contextRecommendations);

    // Quality-driven recommendations
    const qualityRecommendations = this.getQualityDrivenRecommendations(characteristics, _question);
    recommendations.push(...qualityRecommendations);

    return recommendations.sort((a, b) => b.priority - a.priority).slice(0, 5); // Top 5 recommendations
  }

  /**
   * Calculate quality metrics for the analysis
   */
  private calculateQualityMetrics(
    response: string,
    insights: readonly InsightExtraction[],
    characteristics: ResponseCharacteristics
  ): {
    completeness: ConfidenceLevel;
    depth: ConfidenceLevel;
    relevance: ConfidenceLevel;
    actionability: ConfidenceLevel;
  } {
    // Completeness based on response length and structure
    const completeness = Math.min(
      (response.length / 200) * 0.5 + // Length factor
        characteristics.specificity * 0.3 + // Specificity factor
        (insights.length / 5) * 0.2, // Insights factor
      1.0
    );

    // Depth based on complexity and technicality
    const depth = Math.min(
      characteristics.complexity * 0.6 + characteristics.technicality * 0.4,
      1.0
    );

    // Relevance based on insight confidence and engagement
    const avgInsightConfidence =
      insights.length > 0
        ? insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length
        : 0.5;

    const relevance = Math.min(avgInsightConfidence * 0.7 + characteristics.engagement * 0.3, 1.0);

    // Actionability based on specificity and concrete content
    const actionability = Math.min(
      characteristics.specificity * 0.6 +
        (insights.filter(i => i.type === 'requirement' || i.type === 'constraint').length /
          insights.length) *
          0.4,
      1.0
    );

    return { completeness, depth, relevance, actionability };
  }

  // Helper methods for various calculations...

  private calculateClarity(response: string): ConfidenceLevel {
    // Simple heuristic: longer sentences and complex words reduce clarity
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
    const complexWords = response.match(/\b\w{8,}\b/g)?.length || 0;

    const clarityScore = Math.max(
      1.0 - avgSentenceLength / 200 - complexWords / response.split(/\s+/).length,
      0
    );
    return Math.min(clarityScore, 1.0);
  }

  private calculateCompleteness(response: string, _expectedType: string): ConfidenceLevel {
    const wordCount = response.split(/\s+/).length;
    const hasStructure = /(?:first|second|also|moreover|however|because|therefore)/i.test(response);

    let completeness = Math.min(wordCount / 50, 1.0); // Base on word count
    if (hasStructure) completeness = Math.min(completeness + 0.2, 1.0);

    return completeness;
  }

  private calculateDepth(response: string): ConfidenceLevel {
    const causalWords = (
      response.match(/\b(?:because|since|due to|leads to|results in|causes)\b/gi) || []
    ).length;
    const analysisWords = (
      response.match(/\b(?:analyze|consider|evaluate|compare|contrast)\b/gi) || []
    ).length;

    return Math.min((causalWords + analysisWords) / 10, 1.0);
  }

  private calculateRelevance(response: string, expectedType: string): ConfidenceLevel {
    // Simple keyword matching based on expected response type
    const typeKeywords: Record<string, string[]> = {
      definition: ['is', 'means', 'refers to', 'defined as'],
      explanation: ['because', 'since', 'due to', 'reason'],
      example: ['for example', 'such as', 'like', 'instance'],
      justification: ['should', 'must', 'necessary', 'important'],
      clarification: ['specifically', 'precisely', 'exactly', 'clear'],
    };

    const keywords = typeKeywords[expectedType] || [];
    const matches = keywords.filter(keyword =>
      response.toLowerCase().includes(keyword.toLowerCase())
    ).length;

    return Math.min(matches / keywords.length, 1.0);
  }

  // Additional helper methods would be implemented here...
  // For brevity, including simplified versions of key methods

  private calculateComplexity(response: string): ConfidenceLevel {
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgLength =
      sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;
    return Math.min(avgLength / 20, 1.0);
  }

  private calculateSpecificity(response: string): ConfidenceLevel {
    const specificWords = (
      response.match(/\b(?:exactly|precisely|specifically|particular|detailed|concrete)\b/gi) || []
    ).length;
    const examples = (
      response.match(/\b(?:for example|such as|like|instance|specifically)\b/gi) || []
    ).length;
    return Math.min((specificWords + examples) / 5, 1.0);
  }

  private detectEmotionalTone(
    response: string
  ): 'neutral' | 'positive' | 'negative' | 'uncertain' | 'confident' {
    const uncertain = /\b(?:maybe|perhaps|possibly|might|could|uncertain|unsure)\b/gi.test(
      response
    );
    const confident = /\b(?:definitely|certainly|absolutely|clearly|obviously)\b/gi.test(response);
    const negative = /\b(?:wrong|bad|problem|issue|difficult|hard)\b/gi.test(response);
    const positive = /\b(?:good|great|excellent|perfect|successful)\b/gi.test(response);

    if (uncertain) return 'uncertain';
    if (confident) return 'confident';
    if (negative) return 'negative';
    if (positive) return 'positive';
    return 'neutral';
  }

  private calculateTechnicality(response: string, _context: QuestionContext): ConfidenceLevel {
    const technicalTerms = (
      response.match(
        /\b(?:algorithm|interface|protocol|architecture|implementation|specification)\b/gi
      ) || []
    ).length;
    const wordCount = response.split(/\s+/).length;
    return Math.min((technicalTerms / wordCount) * 10, 1.0);
  }

  private detectDefensiveness(response: string): ConfidenceLevel {
    const defensiveMarkers = (
      response.match(/\b(?:but|however|actually|well|obviously|of course)\b/gi) || []
    ).length;
    const wordCount = response.split(/\s+/).length;
    return Math.min((defensiveMarkers / wordCount) * 20, 1.0);
  }

  private calculateEngagement(response: string): ConfidenceLevel {
    const engagementMarkers = (
      response.match(/\b(?:interesting|think|consider|believe|feel|wonder)\b/gi) || []
    ).length;
    const questions = (response.match(/\?/g) || []).length;
    const wordCount = response.split(/\s+/).length;
    return Math.min(((engagementMarkers + questions) / wordCount) * 15, 1.0);
  }

  // Simplified implementations of extraction helpers
  private extractSurroundingContext(response: string, match: string): string {
    const index = response.indexOf(match);
    const start = Math.max(0, index - 50);
    const end = Math.min(response.length, index + match.length + 50);
    return response.substring(start, end);
  }

  private calculateConceptConfidence(
    match: string,
    _response: string,
    context?: QuestionContext
  ): ConfidenceLevel {
    let confidence = 0.6; // Base confidence
    if (match.length > 5) confidence += 0.1; // Longer terms more likely to be concepts
    if (/^[A-Z]/.test(match)) confidence += 0.1; // Capitalized terms
    if (context?.extractedConcepts.includes(match)) confidence += 0.2; // Already known
    return Math.min(confidence, 1.0);
  }

  private calculateAssumptionConfidence(match: string, _response: string): ConfidenceLevel {
    let confidence = 0.7; // Base confidence for explicit assumption markers
    if (match.includes('obviously') || match.includes('clearly')) confidence += 0.2;
    return Math.min(confidence, 1.0);
  }

  private calculateContradictionConfidence(match: string, _response: string): ConfidenceLevel {
    let confidence = 0.6; // Base confidence
    if (match.includes('but') || match.includes('however')) confidence += 0.2;
    return Math.min(confidence, 1.0);
  }

  private calculateRequirementConfidence(match: string, _response: string): ConfidenceLevel {
    let confidence = 0.7; // Base confidence
    if (match.includes('must') || match.includes('required')) confidence += 0.2;
    return Math.min(confidence, 1.0);
  }

  private calculateConstraintConfidence(match: string, _response: string): ConfidenceLevel {
    let confidence = 0.6; // Base confidence
    if (match.includes('cannot') || match.includes('limited')) confidence += 0.2;
    return Math.min(confidence, 1.0);
  }

  private extractFocusRelatedConcepts(response: string, focus: string): InsightExtraction[] {
    const focusWords = focus.toLowerCase().split(/\s+/);
    const concepts: InsightExtraction[] = [];

    for (const word of focusWords) {
      if (response.toLowerCase().includes(word)) {
        concepts.push({
          type: 'concept',
          content: word,
          confidence: 0.8,
          source: 'inferred',
          context: focus,
          relatedPatterns: [PatternType.DEFINITION_SEEKING],
        });
      }
    }

    return concepts;
  }

  private extractImplicitAssumptions(response: string): InsightExtraction[] {
    // Simplified implementation - would use more sophisticated NLP in practice
    const statements = response.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const assumptions: InsightExtraction[] = [];

    for (const statement of statements) {
      if (/\b(?:all|every|always|never|nobody|everyone)\b/i.test(statement)) {
        assumptions.push({
          type: 'assumption',
          content: statement.trim(),
          confidence: 0.5,
          source: 'implicit',
          context: statement,
          relatedPatterns: [PatternType.ASSUMPTION_EXCAVATION],
        });
      }
    }

    return assumptions;
  }

  private findLogicalContradictions(response: string): InsightExtraction[] {
    // Simplified implementation - would use more sophisticated logic analysis
    const contradictions: InsightExtraction[] = [];

    // Look for conflicting statements in same response
    if (
      /\b(?:can)\b.*?\b(?:cannot|can't)\b/i.test(response) ||
      /\b(?:will)\b.*?\b(?:won't|will not)\b/i.test(response)
    ) {
      contradictions.push({
        type: 'contradiction',
        content: 'Conflicting modal statements detected',
        confidence: 0.7,
        source: 'inferred',
        context: response,
        relatedPatterns: [PatternType.CONSISTENCY_TESTING],
      });
    }

    return contradictions;
  }

  private deduplicateInsights(insights: InsightExtraction[]): InsightExtraction[] {
    const seen = new Set<string>();
    return insights.filter(insight => {
      const key = `${insight.type}:${insight.content.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private suggestFollowUpPatterns(
    _currentPattern: PatternType,
    concepts: string[],
    assumptions: string[],
    contradictions: string[]
  ): PatternType[] {
    const suggestions: PatternType[] = [];

    if (concepts.length > 0) {
      suggestions.push(PatternType.DEFINITION_SEEKING, PatternType.CONCEPTUAL_CLARITY);
    }

    if (assumptions.length > 0) {
      suggestions.push(PatternType.ASSUMPTION_EXCAVATION, PatternType.CONSISTENCY_TESTING);
    }

    if (contradictions.length > 0) {
      suggestions.push(PatternType.CONSISTENCY_TESTING, PatternType.NECESSITY_TESTING);
    }

    return [...new Set(suggestions)].slice(0, 3);
  }

  private getPatternSpecificFollowUps(
    insight: InsightExtraction,
    _currentPattern: PatternType,
    characteristics: ResponseCharacteristics
  ): FollowUpRecommendation[] {
    const recommendations: FollowUpRecommendation[] = [];

    if (insight.type === 'concept' && characteristics.specificity < 0.5) {
      recommendations.push({
        pattern: PatternType.CONCRETE_INSTANTIATION,
        priority: 0.8,
        reason: 'Concept mentioned but needs concrete example',
        targetInsight: insight.content,
        contextVariables: { concept: insight.content },
      });
    }

    if (insight.type === 'assumption' && characteristics.defensiveness < 0.3) {
      recommendations.push({
        pattern: PatternType.CONSISTENCY_TESTING,
        priority: 0.9,
        reason: 'Assumption identified and user seems open to examination',
        targetInsight: insight.content,
        contextVariables: { assumption: insight.content },
      });
    }

    return recommendations;
  }

  private getContextDrivenRecommendations(
    context: QuestionContext,
    characteristics: ResponseCharacteristics,
    _insights: readonly InsightExtraction[]
  ): FollowUpRecommendation[] {
    const recommendations: FollowUpRecommendation[] = [];

    if (
      context.category === ContextCategory.REQUIREMENTS_REFINEMENT &&
      characteristics.specificity < 0.6
    ) {
      recommendations.push({
        pattern: PatternType.CONCRETE_INSTANTIATION,
        priority: 0.85,
        reason: 'Requirements need more specific details',
        targetInsight: 'specification detail',
        contextVariables: { area: context.currentFocus },
      });
    }

    return recommendations;
  }

  private getQualityDrivenRecommendations(
    characteristics: ResponseCharacteristics,
    _question: GeneratedQuestion
  ): FollowUpRecommendation[] {
    const recommendations: FollowUpRecommendation[] = [];

    if (characteristics.engagement < 0.5) {
      recommendations.push({
        pattern: PatternType.VALUE_CLARIFICATION,
        priority: 0.7,
        reason: 'Low engagement - explore what matters to user',
        targetInsight: 'user motivation',
        contextVariables: { goal: 'engagement' },
      });
    }

    return recommendations;
  }
}
