import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/connection'
import { themes } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// MARK: - Dynamic Theme Management API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showId = searchParams.get('showId');
    const venueId = searchParams.get('venueId');
    const category = searchParams.get('category');

    console.log('🎨 Fetching dynamic themes...');

    let themeQuery = db.select().from(themes);

    if (showId) {
      // Get theme for specific show
      themeQuery = themeQuery.where(eq(themes.showId, showId));
    } else if (venueId) {
      // Get venue's default theme
      themeQuery = themeQuery.where(eq(themes.venueId, venueId));
    } else if (category) {
      // Get category default theme
      themeQuery = themeQuery.where(eq(themes.category, category));
    }

    const themeData = await themeQuery.limit(1);

    if (themeData.length === 0) {
      // Return generic theme as fallback
      return NextResponse.json({
        id: 'generic',
        name: 'Generic Theme',
        primaryColor: '#4A90E2',
        accentColor: '#357ABD',
        backgroundColor: {
          colors: ['#0A0A0F', '#1A1A2E'],
          startPoint: 'topLeading',
          endPoint: 'bottomTrailing'
        },
        iconName: 'star.fill',
        isActive: true,
        metadata: {
          createdBy: 'system',
          lastModified: new Date().toISOString()
        }
      });
    }

    const theme = themeData[0];
    console.log(`✅ Found theme: ${theme.name} for query`);

    return NextResponse.json({
      id: theme.id,
      name: theme.name,
      primaryColor: theme.primaryColor,
      accentColor: theme.accentColor,
      backgroundColor: JSON.parse(theme.backgroundGradient),
      iconName: theme.iconName,
      textColors: JSON.parse(theme.textColors || '{}'),
      buttonStyles: JSON.parse(theme.buttonStyles || '{}'),
      seatColors: JSON.parse(theme.seatColors || '{}'),
      isActive: theme.isActive,
      metadata: {
        venueId: theme.venueId,
        showId: theme.showId,
        category: theme.category,
        createdBy: theme.createdBy,
        lastModified: theme.updatedAt?.toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error fetching themes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch themes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const themeData = await request.json();
    console.log('🎨 Creating/updating theme:', themeData.name);

    const themeRecord = {
      id: themeData.id || `theme-${Date.now()}`,
      name: themeData.name,
      primaryColor: themeData.primaryColor,
      accentColor: themeData.accentColor,
      backgroundGradient: JSON.stringify(themeData.backgroundColor),
      iconName: themeData.iconName,
      textColors: JSON.stringify(themeData.textColors || {}),
      buttonStyles: JSON.stringify(themeData.buttonStyles || {}),
      seatColors: JSON.stringify(themeData.seatColors || {}),
      venueId: themeData.venueId,
      showId: themeData.showId,
      category: themeData.category,
      isActive: themeData.isActive ?? true,
      createdBy: themeData.createdBy || 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert or update theme
    const result = await db.insert(themes)
      .values(themeRecord)
      .onConflictDoUpdate({
        target: themes.id,
        set: {
          name: themeRecord.name,
          primaryColor: themeRecord.primaryColor,
          accentColor: themeRecord.accentColor,
          backgroundGradient: themeRecord.backgroundGradient,
          iconName: themeRecord.iconName,
          textColors: themeRecord.textColors,
          buttonStyles: themeRecord.buttonStyles,
          seatColors: themeRecord.seatColors,
          isActive: themeRecord.isActive,
          updatedAt: themeRecord.updatedAt
        }
      });

    console.log('✅ Theme saved successfully');

    return NextResponse.json({
      success: true,
      themeId: themeRecord.id,
      message: 'Theme saved successfully'
    });

  } catch (error) {
    console.error('❌ Error saving theme:', error);
    return NextResponse.json(
      { error: 'Failed to save theme' },
      { status: 500 }
    );
  }
}

// MARK: - Theme Presets for Quick Setup
export async function GET_PRESETS() {
  return NextResponse.json({
    presets: [
      {
        name: 'Broadway Gold',
        primaryColor: '#FFD700',
        accentColor: '#B8860B',
        backgroundColor: {
          colors: ['#1A1A0F', '#2A2A1F'],
          startPoint: 'topLeading',
          endPoint: 'bottomTrailing'
        },
        iconName: 'star.fill',
        category: 'musical'
      },
      {
        name: 'West End Red',
        primaryColor: '#DC143C',
        accentColor: '#8B0000',
        backgroundColor: {
          colors: ['#1F0A0A', '#2F1A1A'],
          startPoint: 'topLeading',
          endPoint: 'bottomTrailing'
        },
        iconName: 'theatermasks',
        category: 'drama'
      },
      {
        name: 'Comedy Club Yellow',
        primaryColor: '#FFD700',
        accentColor: '#FFA500',
        backgroundColor: {
          colors: ['#1F1A0A', '#2F2A1A'],
          startPoint: 'topLeading',
          endPoint: 'bottomTrailing'
        },
        iconName: 'face.smiling',
        category: 'comedy'
      },
      {
        name: 'Opera House Purple',
        primaryColor: '#8A2BE2',
        accentColor: '#4B0082',
        backgroundColor: {
          colors: ['#1A0A1F', '#2A1A2F'],
          startPoint: 'topLeading',
          endPoint: 'bottomTrailing'
        },
        iconName: 'music.note',
        category: 'opera'
      }
    ]
  });
} 