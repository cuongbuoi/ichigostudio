import type { ProductMeta } from '../types/product'

export interface Crumb {
  name: string
  /** Đường dẫn nội bộ ("/danh-muc/x"); mục cuối (trang hiện tại) bỏ trống. */
  to?: string
}

// Trang chủ > Danh mục > <danh mục> > <sản phẩm>; SP chưa gán danh mục thì qua Bộ sưu tập.
export function productCrumbs(p: Pick<ProductMeta, 'title' | 'category' | 'categorySlug'>): Crumb[] {
  const home: Crumb = { name: 'Trang chủ', to: '/' }
  if (!p.categorySlug) return [home, { name: 'Bộ sưu tập', to: '/san-pham' }, { name: p.title }]
  return [home, { name: 'Danh mục', to: '/danh-muc' }, { name: p.category, to: `/danh-muc/${p.categorySlug}` }, { name: p.title }]
}

export function breadcrumbJsonLd(crumbs: Crumb[], siteUrl: string, currentUrl: string) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.to ? `${siteUrl}${c.to === '/' ? '' : c.to}` : currentUrl,
    })),
  }
}

export function productJsonLd(p: ProductMeta, siteUrl: string) {
  const url = `${siteUrl}/san-pham/${p.slug}`
  const images = (p.images?.length ? p.images : [p.cover]).filter(Boolean)
  return {
    '@type': 'Product',
    '@id': `${url}#product`,
    sku: p.id,
    name: p.title,
    image: images,
    description: `${p.title} - ${p.category}. Thiết kế và in 3D FDM${p.material ? ` (${p.material})` : ''} bởi Ichigo Studio.`,
    category: p.category,
    material: p.material,
    brand: { '@type': 'Brand', name: 'Ichigo Studio' },
    url,
    ...(p.price != null
      ? {
          offers: {
            '@type': 'Offer',
            price: p.price,
            priceCurrency: 'VND',
            availability: 'https://schema.org/InStock',
            itemCondition: 'https://schema.org/NewCondition',
            seller: { '@id': `${siteUrl}/#organization` },
            // Hàng in theo đơn: không nhận trả (chỉ gửi bù chi tiết lỗi/gãy). Xem /chinh-sach/doi-tra.
            hasMerchantReturnPolicy: {
              '@type': 'MerchantReturnPolicy',
              applicableCountry: 'VN',
              returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
              merchantReturnLink: `${siteUrl}/chinh-sach/doi-tra`,
            },
            url,
          },
        }
      : {}),
  }
}
