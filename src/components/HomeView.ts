import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'


export function useHomeView() {
    const router = useRouter()
    const authStore = useAuthStore()

    interface UserInfo { account: string; email: string }
    const userInfo = ref<UserInfo>({ account: '加载中...', email: '' })

    async function handleLogout() {
        await authStore.logout()
        router.push({ name: 'login' })
    }

    async function fetchUserInfo() {
        try {
            const info = await authStore.getUserInfo()
            userInfo.value = { account: info.account, email: info.email }
        } catch {
            router.push({ name: 'login' })
        }
    }

    const slideWidth = 800
    const currentIndex = ref(0)
    const totalSlides = 4
    const visibleCount = 2          // 一屏想露出几张
    const cardWidth = 580        // 与 CSS 内宽度保持一致
    const gap = 24         // 与 CSS gap 同值 (px)

    interface SlideDesc { title: string; text: string }
    const descriptions: SlideDesc[] = [
        {
            title:
                '亚历山大“国会棒球队”训练枪击案',
            text:
                '2017年6月14日，枪手James T. Hodgkinson在国会共和党议员晨练时持步枪扫射，击伤时任众议院多数党党鞭Steve Scalise及4人，枪手当场被击毙。'
                + '这是数十年来首次有多名在任联邦议员遭枪击，促使国会警察检讨对场外活动的安保，并被FBI后续定性为“国内暴力极端主义”案件。'
        },
        {
            title:
                '美国国会大厦冲击事件',
            text:
                '2021年1月6日，大批示威者试图阻止总统选举结果认证，闯入议会两院会场，导致5人死亡、140余名执勤人员受伤。事件引发全国范围刑事调查（起诉人数已逾1200人）与多轮国会听证，对美国政治与治安现实造成深远震荡。'
        },
        {
            title:
                'Nationals Park球场外枪击案',
            text:
                '2021年7月17日，棒球赛（国民队对教士队）第六局外场发生车辆交火，3人中弹，比赛被迫中断，数千名观众与球员紧急避难。事件虽属街头械斗，却直接冲击体育与旅游业形象，凸显常规枪支暴力对公共场所安全的外溢影响。'
        },
        {
            title:
                '国会大厦北入口汽车冲撞袭警案',
            text:
                '2021年4月2日，25岁袭击者Noah Green驾车撞击防护桩并持刀冲向警员，造成资深国会警官William Evans殉职、另一名警员受伤，袭击者被当场击毙。距“1·6”国会冲击案件不到三个月，该案件再度暴露围栏撤除后的防区脆弱性，国会随即延长部分临时屏障和国民警卫队驻防期限。'
        }
    ]

    const links = [
        'https://en.wikipedia.org/wiki/Congressional_baseball_shooting',   // 对应 1.jpg
        'https://americanoversight.org/investigation/the-january-6-attack-on-the-u-s-capitol/',  // 对应 2.jpg
        'https://www.reuters.com/world/us/gunshots-fired-outside-washington-nationals-baseball-stadium-team-says-2021-07-18/',   // 对应 5.jpg
        'https://en.wikipedia.org/wiki/2021_United_States_Capitol_car_attack'   // 对应 6.jpg
    ]

    const cards = ref([
        {
            id: 1, img: new URL('@/data/images/犯罪地图.png', import.meta.url).href,
            title: '犯罪地图',
            desc: '提供单一日期的基础犯罪数据可视化查询，和查询结果的图表统计分析，便于用户直观感受近期犯罪态势分布。',
            to: '/crime-map'
        },
        {
            id: 2, img: new URL('@/data/images/冷热点分析.png', import.meta.url).href,
            title: '数据分析',
            desc: '提供更长时间段、更为全面、多维角度的数据分析，结合聚类分析、热力图可视化、数据关联分析等数据分析方法，总结得出更为精确的阶段性结论。',
            to: '/data-analysis'
        },
        {
            id: 3, img: new URL('@/data/images/犯罪预测.png', import.meta.url).href,
            title: '犯罪预测',
            desc: '根据现有的犯罪事件数据，构建时序分析模型对未来特定地区的安全系数进行评估，识别风险较大的地区，提醒用户出行规避。',
            to: "/crime-prediction"
        },
        {
            id: 4, img: new URL('@/data/images/租房推荐.png', import.meta.url).href,
            title: '租房推荐',
            desc: '通过结合犯罪数据与房源数据，通过设定相应的权重，计算房源的安全性评分，推荐出最安全的房源。',
            to: "/rental-recommendation"
        }
        // …继续添加
    ])


    let timer: number

    const slider = ref<HTMLElement>()
    const slideTrack = ref<HTMLElement>()
    const indicators = ref<HTMLElement>()

    const bannerImgRight = ref(false)

    function updateSlide() {
        slideTrack.value!.style.transform = `translateX(-${currentIndex.value * slideWidth}px)`
    }

    function updateDots() {
        indicators.value?.childNodes.forEach((n: any, i: number) => n.classList.toggle('active', i === currentIndex.value))
    }

    function moveSlide(dir: number) {
        currentIndex.value = (currentIndex.value + dir + totalSlides) % totalSlides
        updateSlide();
        updateDots();
    }

    function buildDots() {
        if (!indicators.value) return
        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('div')
            dot.className = 'indicator' + (i === 0 ? ' active' : '')
            dot.onclick = () => { currentIndex.value = i; updateSlide(); updateDots() }
            indicators.value.appendChild(dot)
        }
    }

    function start() { timer = window.setInterval(() => moveSlide(1), 5000) }
    function stop() { clearInterval(timer) }

    function openLink(idx: number) {
        window.open(links[idx], '_blank')
    }

    const activeIdx = ref(0)

    const maxIdx = computed(() =>
        Math.max(0, cards.value.length - visibleCount)
    )

    function nextCard() {
        if (activeIdx.value < maxIdx.value) activeIdx.value++
        else activeIdx.value = 0            // 循环播放；不循环就注释掉
    }

    function prevCard() {
        if (activeIdx.value > 0) activeIdx.value--
        else activeIdx.value = maxIdx.value
    }

    onMounted(() => {
        fetchUserInfo()
        buildDots()
        updateSlide()
        start()
        slider.value?.addEventListener('mouseenter', stop)
        slider.value?.addEventListener('mouseleave', start)
    })

    onBeforeUnmount(stop)

    return {
        // 状态
        userInfo, currentIndex, slider, slideTrack, indicators, descriptions, bannerImgRight, cards, activeIdx, cardWidth, gap,
        // 行为
        moveSlide, handleLogout, openLink, nextCard, prevCard
    }
}