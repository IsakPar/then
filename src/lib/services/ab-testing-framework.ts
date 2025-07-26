import { db } from '@/lib/db/connection'
import { sql } from 'drizzle-orm'

/**
 * 🧪 A/B TESTING FRAMEWORK FOR PRICING OPTIMIZATION
 * 
 * Enterprise-grade experimentation platform
 * - Multiple concurrent pricing experiments
 * - Statistical significance testing
 * - Real-time performance tracking
 * - Automatic experiment control and stopping rules
 * - Revenue impact measurement
 */

export interface PricingExperiment {
  id: string
  name: string
  description: string
  status: 'draft' | 'running' | 'paused' | 'completed' | 'stopped'
  startDate: Date
  endDate?: Date
  
  // Experiment configuration
  trafficAllocation: number        // Percentage of traffic (0-100)
  targetShows: number[]           // Show IDs to test on
  targetSections?: string[]       // Section types to test (optional)
  
  // Test variants
  controlGroup: ExperimentVariant
  testGroups: ExperimentVariant[]
  
  // Success metrics
  primaryMetric: 'revenue' | 'conversion' | 'units_sold' | 'average_order_value'
  secondaryMetrics: string[]
  minimumDetectableEffect: number  // Minimum improvement to detect (%)
  significanceLevel: number        // Statistical significance (usually 0.05)
  power: number                   // Statistical power (usually 0.8)
  
  // Current results
  currentResults?: ExperimentResults
  isSignificant?: boolean
  winningVariant?: string
  
  // Auto-stopping rules
  maxDuration: number             // Maximum days to run
  minimumSampleSize: number       // Minimum bookings per variant
  stopIfSignificant: boolean      // Auto-stop when significant
  stopIfNegative: boolean         // Auto-stop if test group performs worse
}

export interface ExperimentVariant {
  id: string
  name: string
  description: string
  
  // Pricing strategy
  strategy: 'control' | 'dynamic' | 'aggressive' | 'conservative' | 'custom'
  priceMultiplier?: number        // Custom price multiplier
  customStrategy?: any            // Custom pricing strategy object
  
  // Traffic allocation within experiment
  trafficSplit: number            // Percentage of experiment traffic (0-100)
  
  // Performance tracking
  metrics?: VariantMetrics
}

export interface VariantMetrics {
  // Volume metrics
  impressions: number             // Seat map views
  conversions: number            // Actual bookings
  conversionRate: number         // Conversion %
  
  // Revenue metrics
  totalRevenue: number           // Total revenue in pence
  averageOrderValue: number      // Average booking value
  revenuePerVisitor: number      // Revenue per impression
  
  // Operational metrics
  bounceRate: number             // % who left immediately after seeing prices
  cartAbandonmentRate: number    // % who added seats but didn't book
  timeToDecision: number         // Average time to book (minutes)
  
  // Satisfaction metrics
  customerSatisfactionScore?: number  // Optional satisfaction rating
  priceComplaintRate?: number         // % of negative price feedback
}

export interface ExperimentResults {
  experimentId: string
  
  // Overall experiment performance
  totalImpressions: number
  totalConversions: number
  totalRevenue: number
  
  // Variant comparison
  variants: {
    [variantId: string]: {
      metrics: VariantMetrics
      statisticalSignificance: number
      confidenceInterval: [number, number]
      sampleSize: number
    }
  }
  
  // Statistical analysis
  primaryMetricLift: number       // % improvement over control
  primaryMetricPValue: number     // Statistical p-value
  isStatisticallySignificant: boolean
  confidenceLevel: number
  
  // Business impact
  projectedAnnualImpact: number   // Projected annual revenue impact
  riskAssessment: 'low' | 'medium' | 'high'
  recommendation: 'continue' | 'stop' | 'implement' | 'modify'
  
  lastUpdated: Date
}

export interface ExperimentAssignment {
  userId?: string
  sessionId: string
  showId: number
  experimentId: string
  variantId: string
  assignedAt: Date
  exposureType: 'view' | 'interaction' | 'conversion'
}

export class ABTestingFramework {
  
  /**
   * 🚀 Create new pricing experiment
   */
  async createExperiment(experiment: Omit<PricingExperiment, 'id' | 'status' | 'currentResults'>): Promise<string> {
    try {
      console.log(`🧪 Creating pricing experiment: ${experiment.name}`)
      
      const experimentId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Store experiment configuration (in production, use dedicated experiment table)
      await this.storeExperimentConfig(experimentId, {
        ...experiment,
        id: experimentId,
        status: 'draft'
      })
      
      console.log(`✅ Created experiment ${experimentId}`)
      return experimentId
    } catch (error) {
      console.error('❌ Error creating experiment:', error)
      throw new Error('Failed to create experiment')
    }
  }

  /**
   * 🎯 Assign user to experiment variant
   */
  async assignToExperiment(
    sessionId: string,
    showId: number,
    userId?: string
  ): Promise<ExperimentAssignment | null> {
    try {
      // Get active experiments for this show
      const activeExperiments = await this.getActiveExperiments(showId)
      
      if (activeExperiments.length === 0) {
        return null // No experiments running for this show
      }
      
      // For simplicity, use the first active experiment
      const experiment = activeExperiments[0]
      
      // Check if user is already assigned to this experiment
      const existingAssignment = await this.getExistingAssignment(sessionId, experiment.id)
      if (existingAssignment) {
        return existingAssignment
      }
      
      // Determine if user should be in experiment based on traffic allocation
      const random = Math.random() * 100
      if (random > experiment.trafficAllocation) {
        return null // User not selected for experiment
      }
      
      // Assign to variant based on traffic split
      const variantId = this.selectVariant(experiment)
      
      const assignment: ExperimentAssignment = {
        userId,
        sessionId,
        showId,
        experimentId: experiment.id,
        variantId,
        assignedAt: new Date(),
        exposureType: 'view'
      }
      
      // Store assignment
      await this.storeAssignment(assignment)
      
      console.log(`🎯 Assigned ${sessionId} to experiment ${experiment.id}, variant ${variantId}`)
      return assignment
    } catch (error) {
      console.error('❌ Error assigning to experiment:', error)
      return null
    }
  }

  /**
   * 📊 Track experiment event (view, interaction, conversion)
   */
  async trackEvent(
    sessionId: string,
    showId: number,
    eventType: 'view' | 'interaction' | 'conversion',
    eventData?: {
      revenue?: number
      seatCount?: number
      sectionType?: string
      priceShown?: number
      timeSpent?: number
    }
  ): Promise<void> {
    try {
      // Get user's experiment assignment
      const assignment = await this.getCurrentAssignment(sessionId, showId)
      if (!assignment) {
        return // User not in any experiment
      }
      
      console.log(`📊 Tracking ${eventType} for experiment ${assignment.experimentId}, variant ${assignment.variantId}`)
      
      // Store event (in production, use dedicated events table)
      await this.storeEvent({
        experimentId: assignment.experimentId,
        variantId: assignment.variantId,
        sessionId,
        eventType,
        eventData,
        timestamp: new Date()
      })
      
      // Update experiment metrics
      await this.updateExperimentMetrics(assignment.experimentId)
    } catch (error) {
      console.error('❌ Error tracking experiment event:', error)
    }
  }

  /**
   * 📈 Calculate experiment results with statistical significance
   */
  async calculateResults(experimentId: string): Promise<ExperimentResults> {
    try {
      console.log(`📈 Calculating results for experiment ${experimentId}`)
      
      const experiment = await this.getExperiment(experimentId)
      if (!experiment) {
        throw new Error(`Experiment ${experimentId} not found`)
      }
      
      // Get metrics for each variant
      const variantResults: any = {}
      let totalImpressions = 0
      let totalConversions = 0
      let totalRevenue = 0
      
      for (const variant of [experiment.controlGroup, ...experiment.testGroups]) {
        const metrics = await this.getVariantMetrics(experimentId, variant.id)
        const sampleSize = metrics.impressions
        
        // Calculate confidence interval for conversion rate
        const conversionRate = metrics.conversions / Math.max(metrics.impressions, 1)
        const standardError = Math.sqrt((conversionRate * (1 - conversionRate)) / Math.max(sampleSize, 1))
        const confidenceInterval: [number, number] = [
          Math.max(0, conversionRate - 1.96 * standardError),
          Math.min(1, conversionRate + 1.96 * standardError)
        ]
        
        variantResults[variant.id] = {
          metrics,
          statisticalSignificance: 0, // Will calculate below
          confidenceInterval,
          sampleSize
        }
        
        totalImpressions += metrics.impressions
        totalConversions += metrics.conversions
        totalRevenue += metrics.totalRevenue
      }
      
      // Calculate statistical significance vs control
      const controlMetrics = variantResults[experiment.controlGroup.id].metrics
      let primaryMetricLift = 0
      let primaryMetricPValue = 1.0
      
      if (experiment.testGroups.length > 0) {
        const testMetrics = variantResults[experiment.testGroups[0].id].metrics
        
        // Calculate lift based on primary metric
        switch (experiment.primaryMetric) {
          case 'revenue':
            primaryMetricLift = ((testMetrics.totalRevenue - controlMetrics.totalRevenue) / Math.max(controlMetrics.totalRevenue, 1)) * 100
            break
          case 'conversion':
            primaryMetricLift = ((testMetrics.conversionRate - controlMetrics.conversionRate) / Math.max(controlMetrics.conversionRate, 0.01)) * 100
            break
          case 'average_order_value':
            primaryMetricLift = ((testMetrics.averageOrderValue - controlMetrics.averageOrderValue) / Math.max(controlMetrics.averageOrderValue, 1)) * 100
            break
        }
        
        // Simple p-value calculation (in production, use proper statistical tests)
        primaryMetricPValue = this.calculatePValue(controlMetrics, testMetrics, experiment.primaryMetric)
      }
      
      const isStatisticallySignificant = primaryMetricPValue < experiment.significanceLevel
      
      // Project annual impact
      const dailyRevenue = totalRevenue / Math.max(1, (Date.now() - experiment.startDate.getTime()) / (1000 * 60 * 60 * 24))
      const projectedAnnualImpact = (primaryMetricLift / 100) * dailyRevenue * 365
      
      // Generate recommendation
      let recommendation: 'continue' | 'stop' | 'implement' | 'modify' = 'continue'
      if (isStatisticallySignificant) {
        recommendation = primaryMetricLift > 0 ? 'implement' : 'stop'
      } else if (primaryMetricLift < -10) {
        recommendation = 'stop' // Stop if performance is significantly worse
      }
      
      const results: ExperimentResults = {
        experimentId,
        totalImpressions,
        totalConversions,
        totalRevenue,
        variants: variantResults,
        primaryMetricLift,
        primaryMetricPValue,
        isStatisticallySignificant,
        confidenceLevel: (1 - experiment.significanceLevel) * 100,
        projectedAnnualImpact,
        riskAssessment: Math.abs(primaryMetricLift) > 20 ? 'high' : Math.abs(primaryMetricLift) > 10 ? 'medium' : 'low',
        recommendation,
        lastUpdated: new Date()
      }
      
      console.log(`📈 Experiment results: ${primaryMetricLift.toFixed(2)}% lift, p-value: ${primaryMetricPValue.toFixed(4)}`)
      
      return results
    } catch (error) {
      console.error('❌ Error calculating experiment results:', error)
      throw new Error('Failed to calculate experiment results')
    }
  }

  /**
   * 🛑 Check if experiment should be stopped automatically
   */
  async checkStoppingRules(experimentId: string): Promise<boolean> {
    try {
      const experiment = await this.getExperiment(experimentId)
      const results = await this.calculateResults(experimentId)
      
      if (!experiment || !results) return false
      
      // Check maximum duration
      const daysRunning = (Date.now() - experiment.startDate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysRunning >= experiment.maxDuration) {
        console.log(`⏰ Stopping experiment ${experimentId}: Maximum duration reached`)
        await this.stopExperiment(experimentId, 'Maximum duration reached')
        return true
      }
      
      // Check minimum sample size
      const hasMinimumSample = Object.values(results.variants).every(v => v.sampleSize >= experiment.minimumSampleSize)
      
      if (hasMinimumSample) {
        // Check if should stop due to significance
        if (experiment.stopIfSignificant && results.isStatisticallySignificant) {
          console.log(`📊 Stopping experiment ${experimentId}: Statistical significance reached`)
          await this.stopExperiment(experimentId, 'Statistical significance reached')
          return true
        }
        
        // Check if should stop due to negative performance
        if (experiment.stopIfNegative && results.primaryMetricLift < -5 && results.primaryMetricPValue < 0.1) {
          console.log(`⛔ Stopping experiment ${experimentId}: Negative performance detected`)
          await this.stopExperiment(experimentId, 'Negative performance detected')
          return true
        }
      }
      
      return false
    } catch (error) {
      console.error('❌ Error checking stopping rules:', error)
      return false
    }
  }

  // Private helper methods
  
  private selectVariant(experiment: PricingExperiment): string {
    const random = Math.random() * 100
    let cumulative = 0
    
    // Check control group first
    cumulative += experiment.controlGroup.trafficSplit
    if (random <= cumulative) {
      return experiment.controlGroup.id
    }
    
    // Check test groups
    for (const testGroup of experiment.testGroups) {
      cumulative += testGroup.trafficSplit
      if (random <= cumulative) {
        return testGroup.id
      }
    }
    
    // Fallback to control
    return experiment.controlGroup.id
  }
  
  private calculatePValue(controlMetrics: VariantMetrics, testMetrics: VariantMetrics, metric: string): number {
    // Simplified p-value calculation
    // In production, use proper statistical tests like t-test, chi-square, etc.
    
    if (metric === 'conversion') {
      const p1 = controlMetrics.conversionRate
      const p2 = testMetrics.conversionRate
      const n1 = controlMetrics.impressions
      const n2 = testMetrics.impressions
      
      if (n1 < 30 || n2 < 30) return 1.0 // Not enough data
      
      const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2)
      const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2))
      const zScore = Math.abs(p1 - p2) / Math.max(se, 0.001)
      
      // Convert z-score to p-value (simplified)
      return Math.max(0.001, 2 * (1 - this.normalCDF(zScore)))
    }
    
    return 0.5 // Default p-value for other metrics
  }
  
  private normalCDF(x: number): number {
    // Approximation of normal cumulative distribution function
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)))
  }
  
  private erf(x: number): number {
    // Approximation of error function
    const a1 =  0.254829592
    const a2 = -0.284496736
    const a3 =  1.421413741
    const a4 = -1.453152027
    const a5 =  1.061405429
    const p  =  0.3275911
    
    const sign = x >= 0 ? 1 : -1
    x = Math.abs(x)
    
    const t = 1.0 / (1.0 + p * x)
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
    
    return sign * y
  }

  // Placeholder methods for data storage (implement with actual database)
  
  private async storeExperimentConfig(experimentId: string, experiment: PricingExperiment): Promise<void> {
    // TODO: Store in database
    console.log(`💾 Storing experiment config for ${experimentId}`)
  }
  
  private async getActiveExperiments(showId: number): Promise<PricingExperiment[]> {
    // TODO: Query from database
    return [] // Placeholder
  }
  
  private async getExistingAssignment(sessionId: string, experimentId: string): Promise<ExperimentAssignment | null> {
    // TODO: Query from database
    return null // Placeholder
  }
  
  private async storeAssignment(assignment: ExperimentAssignment): Promise<void> {
    // TODO: Store in database
    console.log(`💾 Storing assignment for ${assignment.sessionId}`)
  }
  
  private async getCurrentAssignment(sessionId: string, showId: number): Promise<ExperimentAssignment | null> {
    // TODO: Query from database
    return null // Placeholder
  }
  
  private async storeEvent(event: any): Promise<void> {
    // TODO: Store in database
    console.log(`💾 Storing event for experiment ${event.experimentId}`)
  }
  
  private async updateExperimentMetrics(experimentId: string): Promise<void> {
    // TODO: Update metrics in database
    console.log(`📊 Updating metrics for experiment ${experimentId}`)
  }
  
  private async getExperiment(experimentId: string): Promise<PricingExperiment | null> {
    // TODO: Query from database
    return null // Placeholder
  }
  
  private async getVariantMetrics(experimentId: string, variantId: string): Promise<VariantMetrics> {
    // TODO: Calculate from database
    return {
      impressions: 100,
      conversions: 10,
      conversionRate: 0.1,
      totalRevenue: 50000,
      averageOrderValue: 5000,
      revenuePerVisitor: 500,
      bounceRate: 0.2,
      cartAbandonmentRate: 0.3,
      timeToDecision: 15
    } // Placeholder
  }
  
  private async stopExperiment(experimentId: string, reason: string): Promise<void> {
    // TODO: Update experiment status in database
    console.log(`🛑 Stopping experiment ${experimentId}: ${reason}`)
  }
}

// Export singleton instance
export const abTestingFramework = new ABTestingFramework() 