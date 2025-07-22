# Hamilton Seat Map Redesign Plan
## Recreating the Bagley Wright Theater Layout

### 🎯 **Objective**
Transform the current Hamilton seat map to precisely match the professional Bagley Wright Theater layout shown in the reference image, featuring 6 distinct sections with proper curved arrangement and color coding.

### 📐 **Reference Layout Analysis**

#### **Stage Configuration**
- **Position**: Top center
- **Label**: "STAGE" 
- **Shape**: Rectangular with rounded corners
- **Color**: Dark background with white text

#### **Section Layout (Front to Back)**

**Upper Level (Main Orchestra)**
1. **Section 1** (Left Upper)
   - **Color**: Purple/Violet (#7C3AED)
   - **Shape**: Curved left wing
   - **Capacity**: ~250 seats
   - **Rows**: 15 rows (A-O)
   - **Curve**: 30° arc facing stage

2. **Section 2** (Center Upper) 
   - **Color**: Orange/Yellow (#F59E0B)
   - **Shape**: Central curved orchestra
   - **Capacity**: ~400 seats  
   - **Rows**: 18 rows (A-R)
   - **Curve**: 60° arc facing stage
   - **Premium pricing tier**

3. **Section 3** (Right Upper)
   - **Color**: Purple/Violet (#7C3AED)
   - **Shape**: Curved right wing (mirror of Section 1)
   - **Capacity**: ~250 seats
   - **Rows**: 15 rows (A-O)
   - **Curve**: 30° arc facing stage

**Lower Level (Balcony)**
4. **Section 4** (Left Balcony)
   - **Color**: Cyan/Blue (#06B6D4)
   - **Shape**: Curved left balcony
   - **Capacity**: ~150 seats
   - **Rows**: 8 rows (A-H)
   - **Elevated position**

5. **Section 5** (Right Balcony)
   - **Color**: Cyan/Blue (#06B6D4) 
   - **Shape**: Curved right balcony (mirror of Section 4)
   - **Capacity**: ~150 seats
   - **Rows**: 8 rows (A-H)
   - **Elevated position**

6. **Section 6** (Center Balcony)
   - **Color**: Cyan/Blue (#06B6D4)
   - **Shape**: Central balcony
   - **Capacity**: ~200 seats
   - **Rows**: 10 rows (A-J)
   - **Best elevated view**

### 🏗️ **Implementation Strategy**

#### **Phase 1: Database Schema Updates**
- [ ] Update Hamilton show sections to match 6-section layout
- [ ] Reconfigure seat positions with professional curved coordinates
- [ ] Update section colors to match reference
- [ ] Set proper pricing tiers per section

#### **Phase 2: Coordinate Engine Enhancement**
- [ ] Implement professional curved seat positioning algorithms
- [ ] Add section boundary calculations to prevent overlaps
- [ ] Create precise arc calculations for each section
- [ ] Ensure proper seat spacing and row alignment

#### **Phase 3: Visual Rendering System**
- [ ] Update EnterpriseSeatMap component to handle new layout
- [ ] Implement section-specific curved rendering
- [ ] Add professional theater styling with shadows and depth
- [ ] Create responsive viewport that auto-fits the complete layout

#### **Phase 4: Section Configuration**
- [ ] Create `BagleyWrightTheaterLayout.ts` configuration file
- [ ] Define precise section boundaries and coordinate systems
- [ ] Set up color themes matching the reference
- [ ] Configure pricing tiers and accessibility features

#### **Phase 5: UI/UX Enhancements**
- [ ] Add section labels positioned like the reference
- [ ] Implement professional theater color scheme
- [ ] Create smooth zoom and pan controls
- [ ] Add section-specific hover effects and selection states

### 🎨 **Visual Design Requirements**

#### **Color Palette**
```
Upper Sections:
- Section 1 & 3: #7C3AED (Purple/Violet)
- Section 2: #F59E0B (Orange/Gold) - Premium

Lower Sections:
- Section 4, 5 & 6: #06B6D4 (Cyan/Blue) - Balcony

Supporting Colors:
- Stage: #1F2937 (Dark Gray)
- Background: #F8FAFC (Light Gray)
- Section Labels: #374151 (Dark Gray)
- Available Seats: Base section color
- Selected Seats: #10B981 (Green)
- Unavailable Seats: #DC2626 (Red)
```

#### **Typography**
- **Section Labels**: Bold, 16px, centered
- **Stage Label**: Bold, 18px, white on dark
- **Seat Numbers**: 10px, white on seat color

### 📊 **Technical Specifications**

#### **SVG ViewBox**
```
viewBox="0 0 1400 900"
```

#### **Section Coordinates**
```typescript
const BAGLEY_WRIGHT_SECTIONS = {
  stage: { x: 600, y: 50, width: 200, height: 40 },
  section1: { centerX: 400, centerY: 500, startAngle: 150, endAngle: 210, radius: 250 },
  section2: { centerX: 700, centerY: 500, startAngle: 210, endAngle: 330, radius: 200 },
  section3: { centerX: 1000, centerY: 500, startAngle: 330, endAngle: 30, radius: 250 },
  section4: { centerX: 350, centerY: 350, startAngle: 140, endAngle: 180, radius: 180 },
  section5: { centerX: 1050, centerY: 350, startAngle: 0, endAngle: 40, radius: 180 },
  section6: { centerX: 700, centerY: 300, startAngle: 180, endAngle: 360, radius: 160 }
};
```

### 🔧 **Implementation Files**

#### **New Files to Create**
1. `src/lib/seatmaps/bagley-wright-layout.ts` - Main layout configuration
2. `src/lib/seatmaps/curved-theater-generator.ts` - Curved seat positioning logic  
3. `src/components/seatmap/BagleyWrightRenderer.tsx` - Specialized renderer
4. `src/app/api/regenerate-bagley-seatmap/route.ts` - Database regeneration endpoint

#### **Files to Modify**
1. `src/components/EnterpriseSeatMap.tsx` - Support new layout system
2. `src/app/hamilton-test/page.tsx` - Test the new layout
3. `scripts/add-hamilton-show.sql` - Update database structure

### 🧪 **Testing Strategy**

#### **Validation Checklist**
- [ ] All 6 sections render correctly with proper colors
- [ ] Sections don't overlap and have proper spacing
- [ ] Seat positions match the curved layout exactly
- [ ] Section labels appear in correct positions
- [ ] Responsive zoom shows entire theater properly
- [ ] Seat selection and hover states work correctly
- [ ] Database seat count matches expected capacity (~1400 seats)
- [ ] All sections are properly clickable and interactive

#### **Performance Requirements**
- [ ] Initial render < 2 seconds for 1400 seats
- [ ] Smooth 60fps zooming and panning
- [ ] Memory usage < 100MB for full seat map
- [ ] Responsive design works on mobile devices

### 🚀 **Deployment Steps**

1. **Database Migration**
   - Run seat map regeneration script
   - Verify seat positions and section assignments
   - Test seat booking functionality

2. **Frontend Updates**  
   - Deploy new EnterpriseSeatMap component
   - Update Hamilton test page
   - Verify all visual elements

3. **Quality Assurance**
   - Compare with reference image side-by-side
   - Test all interactive features
   - Validate accessibility compliance
   - Performance testing on various devices

### 📈 **Success Criteria**

The redesign will be considered successful when:
- ✅ Visual layout matches Bagley Wright Theater reference exactly
- ✅ All 6 sections are properly positioned and colored  
- ✅ Seat selection and booking functionality works perfectly
- ✅ Performance meets all specified requirements
- ✅ Layout is responsive and accessible
- ✅ Code is maintainable and well-documented

### 🔄 **Rollback Plan**

If issues arise during deployment:
1. Database rollback script to restore original Hamilton seats
2. Component fallback to previous EnterpriseSeatMap version  
3. Quick-switch mechanism between old and new layouts
4. Monitoring alerts for performance degradation

---

**Total Estimated Development Time**: 2-3 days
**Priority**: High - Visual Enhancement
**Risk Level**: Medium - Complex coordinate calculations 