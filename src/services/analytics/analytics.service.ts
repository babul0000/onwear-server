import { prisma } from '../../lib/prisma';
import { Role } from '@prisma/client';

export class AnalyticsService {
  /**
   * Track visitor session or page hit
   */
  static async trackVisit(params: {
    sessionId?: string;
    path?: string;
    userAgent?: string;
    ipHash?: string;
    userId?: string;
  }) {
    try {
      return await prisma.visitorLog.create({
        data: {
          sessionId: params.sessionId || null,
          path: params.path || '/',
          userAgent: params.userAgent || null,
          ipHash: params.ipHash || null,
          userId: params.userId || null
        }
      });
    } catch (err) {
      console.error('[AnalyticsService] Error tracking visit:', err);
      return null;
    }
  }

  /**
   * Track a product view and increment views count on product
   */
  static async trackProductView(params: {
    productId: string;
    sessionId?: string;
  }) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: params.productId },
        select: { id: true }
      });

      if (!product) return null;

      const [log] = await Promise.all([
        prisma.productViewLog.create({
          data: {
            productId: params.productId,
            sessionId: params.sessionId || null
          }
        }),
        prisma.product.update({
          where: { id: params.productId },
          data: { views: { increment: 1 } }
        })
      ]);

      return log;
    } catch (err) {
      console.error('[AnalyticsService] Error tracking product view:', err);
      return null;
    }
  }

  /**
   * Generate 100% Real Live Dashboard Analytics
   */
  static async getDashboardOverview() {
    const now = new Date();
    
    // Start of Today (00:00:00.000)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    // Start of Yesterday (00:00:00.000)
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    // End of Yesterday (23:59:59.999)
    const yesterdayEnd = new Date(todayStart.getTime() - 1);

    const [
      totalUsers,
      customersCount,
      adminsCount,
      totalProducts,
      activeProducts,
      blockedProducts,
      allOrders,
      totalVisitorsCount,
      todayVisitorsCount,
      yesterdayVisitorsCount,
      totalProductViewsAgg,
      todayProductViewsCount,
      yesterdayProductViewsCount,
      topViewedProducts
    ] = await Promise.all([
      // Users
      prisma.user.count({ where: { isDeleted: false } }),
      prisma.user.count({ where: { role: Role.customer, isDeleted: false } }),
      prisma.user.count({ where: { role: Role.admin, isDeleted: false } }),

      // Products
      prisma.product.count({ where: { isDeleted: false } }),
      prisma.product.count({ where: { status: 'ACTIVE', isDeleted: false } }),
      prisma.product.count({ where: { OR: [{ status: 'INACTIVE' }, { isDeleted: true }] } }),

      // Orders
      prisma.order.findMany({
        where: { isDeleted: false },
        include: { items: true },
        orderBy: { createdAt: 'desc' }
      }),

      // Visitor logs
      prisma.visitorLog.count(),
      prisma.visitorLog.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.visitorLog.count({ where: { createdAt: { gte: yesterdayStart, lte: yesterdayEnd } } }),

      // Product Views
      prisma.product.aggregate({
        _sum: { views: true },
        where: { isDeleted: false }
      }),
      prisma.productViewLog.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.productViewLog.count({ where: { createdAt: { gte: yesterdayStart, lte: yesterdayEnd } } }),

      // Top viewed products as fallback if no sales
      prisma.product.findMany({
        where: { isDeleted: false },
        orderBy: { views: 'desc' },
        take: 5,
        select: { id: true, name: true, price: true, views: true, image: true }
      })
    ]);

    // Calculate Real Order & Revenue metrics
    const totalOrders = allOrders.length;
    const paidOrders = allOrders.filter((o: any) => o.paymentStatus === 'PAID');
    const totalRevenue = paidOrders.reduce((sum: number, o: any) => sum + o.totalAmount, 0);

    const pendingOrders = allOrders.filter((o: any) => o.status === 'PENDING').length;
    const confirmedOrders = allOrders.filter((o: any) => o.status === 'CONFIRMED').length;
    const processingOrders = allOrders.filter((o: any) => o.status === 'PROCESSING').length;
    const shippedOrders = allOrders.filter((o: any) => o.status === 'SHIPPED').length;
    const deliveredOrders = allOrders.filter((o: any) => o.status === 'DELIVERED').length;
    const cancelledOrders = allOrders.filter((o: any) => o.status === 'CANCELLED').length;

    const todayOrders = allOrders.filter((o: any) => new Date(o.createdAt) >= todayStart);
    const yesterdayOrders = allOrders.filter((o: any) => {
      const d = new Date(o.createdAt);
      return d >= yesterdayStart && d <= yesterdayEnd;
    });

    const todayRevenue = todayOrders
      .filter((o: any) => o.paymentStatus === 'PAID')
      .reduce((sum: number, o: any) => sum + o.totalAmount, 0);

    const yesterdayRevenue = yesterdayOrders
      .filter((o: any) => o.paymentStatus === 'PAID')
      .reduce((sum: number, o: any) => sum + o.totalAmount, 0);

    // Percentage Helper
    const calcGrowth = (today: number, yesterday: number) => {
      if (yesterday === 0) {
        return today > 0 ? 100 : 0;
      }
      return parseFloat((((today - yesterday) / yesterday) * 100).toFixed(2));
    };

    const visitorGrowth = calcGrowth(todayVisitorsCount, yesterdayVisitorsCount);
    const totalProductViews = totalProductViewsAgg._sum.views || 0;
    const productViewsGrowth = calcGrowth(todayProductViewsCount, yesterdayProductViewsCount);
    const ordersGrowth = calcGrowth(todayOrders.length, yesterdayOrders.length);
    const revenueGrowth = calcGrowth(todayRevenue, yesterdayRevenue);

    // Real Conversion Rate
    const conversionRate = totalVisitorsCount > 0 
      ? parseFloat(((totalOrders / totalVisitorsCount) * 100).toFixed(2)) 
      : (totalOrders > 0 ? 100 : 0);

    const todayConversion = todayVisitorsCount > 0 
      ? parseFloat(((todayOrders.length / todayVisitorsCount) * 100).toFixed(2)) 
      : 0;

    const yesterdayConversion = yesterdayVisitorsCount > 0 
      ? parseFloat(((yesterdayOrders.length / yesterdayVisitorsCount) * 100).toFixed(2)) 
      : 0;

    const conversionGrowth = calcGrowth(todayConversion, yesterdayConversion);

    // Top Selling Products Breakdown
    const salesMap: Record<string, { id: string; name: string; quantity: number; revenue: number }> = {};
    allOrders.forEach((order: any) => {
      order.items?.forEach((item: any) => {
        if (!item.productId) return;
        if (!salesMap[item.productId]) {
          salesMap[item.productId] = {
            id: item.productId,
            name: item.productName || 'Unknown Product',
            quantity: 0,
            revenue: 0
          };
        }
        salesMap[item.productId].quantity += item.quantity;
        salesMap[item.productId].revenue += item.subtotal;
      });
    });

    const topSellingProducts = Object.values(salesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Build 7-Day Real Sales & Orders Chart Data
    const chartData: { label: string; date: string; revenue: number; orders: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart.getTime() - i * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1);
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayDate = d.toISOString().split('T')[0];

      const dayOrders = allOrders.filter((o: any) => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= d && orderDate <= dayEnd;
      });

      const dayRevenue = dayOrders
        .filter((o: any) => o.paymentStatus === 'PAID')
        .reduce((sum: number, o: any) => sum + o.totalAmount, 0);

      chartData.push({
        label: dayLabel,
        date: dayDate,
        revenue: dayRevenue,
        orders: dayOrders.length
      });
    }

    return {
      metrics: {
        totalUsers,
        customersCount,
        adminsCount,
        totalProducts,
        activeProducts,
        blockedProducts,
        totalOrders,
        totalRevenue,
        pendingOrders,
        deliveredOrders,
        visitors: {
          total: totalVisitorsCount,
          today: todayVisitorsCount,
          yesterday: yesterdayVisitorsCount,
          growthPercent: visitorGrowth
        },
        productViews: {
          total: totalProductViews,
          today: todayProductViewsCount,
          yesterday: yesterdayProductViewsCount,
          growthPercent: productViewsGrowth
        },
        ordersComparison: {
          total: totalOrders,
          today: todayOrders.length,
          yesterday: yesterdayOrders.length,
          growthPercent: ordersGrowth
        },
        revenueComparison: {
          total: totalRevenue,
          today: todayRevenue,
          yesterday: yesterdayRevenue,
          growthPercent: revenueGrowth
        },
        conversionRate: {
          total: conversionRate,
          today: todayConversion,
          yesterday: yesterdayConversion,
          growthPercent: conversionGrowth
        }
      },
      statusBreakdown: {
        PENDING: pendingOrders,
        CONFIRMED: confirmedOrders,
        PROCESSING: processingOrders,
        SHIPPED: shippedOrders,
        DELIVERED: deliveredOrders,
        CANCELLED: cancelledOrders
      },
      topSellingProducts,
      topViewedProducts,
      chartData
    };
  }
}
