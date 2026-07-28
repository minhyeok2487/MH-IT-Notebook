---
title: "라우터(Router)와 라우팅(Routing) 소개"
date: 2026-07-28
category: Routing
excerpt: "스위치는 왜 인터넷 규모로 못 커지는가. MAC 주소 기반 스위칭의 한계와, 라우터가 IP 주소로 그 문제를 어떻게 푸는지부터 시작한다."
---

스위치(Switch)와 라우터(Router)의 차이점을 살펴보고 라우팅의 기본 개념을 설명합니다.

## 핵심 요약

- **스위치**: MAC 주소(Layer 2) 기반으로 이더넷 프레임을 전달 (스위칭)
- **라우터**: IP 주소(Layer 3) 기반으로 IP 패킷을 전달 (라우팅)
- **라우팅 테이블**: 라우터가 패킷을 어디로 보낼지 결정하는 데 사용하는 경로 정보
- **기본 게이트웨이**: 호스트가 다른 네트워크로 패킷을 보낼 때 사용하는 라우터의 IP 주소
- 라우팅 테이블은 3가지 방법으로 채워진다: **직접 연결(Connected)**, **스태틱 라우트**, **다이나믹 라우팅 프로토콜**

## 스위칭과 라우팅의 차이

스위치는 MAC 주소(MAC Address) 정보를 기반으로 이더넷 프레임(Ethernet Frame)을 전달합니다. 데이터 링크 계층(Data Link Layer, Layer 2)에서 동작하며, 목적지 MAC 주소를 확인하여 올바른 포트로 프레임을 보냅니다.

라우터도 비슷한 역할을 하지만, 네트워크 계층(Network Layer, Layer 3)에서 동작합니다. IP 패킷의 목적지 IP 주소를 확인하고 올바른 인터페이스로 전송합니다.

그렇다면 왜 MAC 주소만으로 모든 통신을 처리하지 않을까요?

![스위치 두 대에 각각 200대씩 컴퓨터가 연결된 구성도](/images/router-routing-intro/switch-scalability.png)

두 대의 스위치가 있고 각 스위치에 200대의 컴퓨터가 연결되어 있다면, 각 스위치는 400개의 MAC 주소를 모두 학습해야 합니다. 인터넷처럼 수백만 개의 장치가 있는 환경에서는 이 방식이 불가능합니다. 스위칭은 **확장성(Scalability)** 이 없습니다. 48비트 MAC 주소는 평면적(flat)이고 계층 구조가 없기 때문입니다.

![라우터 R1, R2로 나뉜 192.168.1.0/24와 192.168.2.0/24 네트워크](/images/router-routing-intro/router-two-networks.png)

라우터를 사용하면 상황이 달라집니다. 왼쪽 200대의 컴퓨터는 192.168.1.0/24 네트워크에, 오른쪽 200대는 192.168.2.0/24 네트워크에 있습니다. R1은 "192.168.2.0/24는 R2 뒤에 있다"는 단일 항목만 있으면 되고, R2도 마찬가지입니다. 400개의 MAC 주소 대신 **네트워크 단위의 경로 정보**만으로 충분합니다.

## 라우팅 동작 예시

그렇다면 라우터는 실제로 어떻게 패킷을 전달할까요? 간단한 예시를 통해 살펴보겠습니다.

![H1-R1-H2 토폴로지와 R1의 라우팅 테이블](/images/router-routing-intro/routing-example-topology.png)

위 그림에서 하나의 라우터와 두 대의 컴퓨터가 있습니다:

- H1: IP 192.168.1.1, 기본 게이트웨이 192.168.1.254
- H2: IP 192.168.2.2, 기본 게이트웨이 192.168.2.254
- R1: FastEthernet 0/0에 192.168.1.254, FastEthernet 1/0에 192.168.2.254

H1이 H2에게 패킷을 보내는 과정:

1. H1이 목적지 IP 주소 192.168.2.2로 IP 패킷을 생성
2. H1은 자신의 서브넷(192.168.1.0/24)과 비교하여 192.168.2.2가 **다른 네트워크**임을 판단 — 자신이 직접 전달할 수 없으므로 **기본 게이트웨이(Default Gateway)** 인 192.168.1.254로 전달
3. R1이 IP 패킷을 수신하고, **라우팅 테이블(Routing Table)** 에서 목적지와 가장 구체적으로 일치하는 항목을 찾아(**Longest Prefix Match**) FastEthernet 1/0으로 전달
4. H2가 IP 패킷을 수신

여기서 **기본 게이트웨이**는 호스트가 속한 네트워크에 연결된 라우터의 IP 주소입니다. 호스트는 다른 네트워크로 패킷을 보낼 때 항상 기본 게이트웨이를 거칩니다. 그리고 **라우팅 테이블**은 라우터가 "이 목적지로 가려면 어느 인터페이스로 보내야 하는가"를 기록한 경로 정보입니다.

### Longest Prefix Match

라우팅 테이블에 목적지와 일치하는 항목이 여러 개 있을 경우, 라우터는 **가장 긴 프리픽스(가장 구체적인 경로)**를 선택합니다. 예를 들어 라우팅 테이블에 다음 두 항목이 있을 때:

```
S    192.168.2.0/24 via 10.0.0.1
S    192.168.0.0/16 via 10.0.0.2
```

목적지가 192.168.2.100이라면, 두 항목 모두 일치하지만 **/24가 /16보다 더 구체적**이므로 10.0.0.1을 통해 전달합니다. 이것이 Longest Prefix Match이며, 라우터 경로 선택의 가장 기본적인 원칙입니다.

### 설정

```
R1(config)#interface fastEthernet 0/0
R1(config-if)#no shutdown
R1(config-if)#ip address 192.168.1.254 255.255.255.0
R1(config-if)#exit
R1(config)#interface FastEthernet 1/0
R1(config-if)#no shutdown
R1(config-if)#ip address 192.168.2.254 255.255.255.0
```

### 라우팅 테이블 확인

```
R1#show ip route
Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP
       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area
       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2
       E1 - OSPF external type 1, E2 - OSPF external type 2
       i - IS-IS, su - IS-IS summary, L1 - IS-IS level-1, L2 - IS-IS level-2
       ia - IS-IS inter area, * - candidate default, U - per-user static route
       o - ODR, P - periodic downloaded static route

Gateway of last resort is not set

      192.168.1.0/24 is variably subnetted, 2 subnets, 2 masks
C        192.168.1.0/24 is directly connected, FastEthernet0/0
L        192.168.1.254/32 is directly connected, FastEthernet0/0
      192.168.2.0/24 is variably subnetted, 2 subnets, 2 masks
C        192.168.2.0/24 is directly connected, FastEthernet1/0
L        192.168.2.254/32 is directly connected, FastEthernet1/0
```

- `C` (Connected): 인터페이스에 IP 주소를 설정하면 자동 등록되는 **네트워크 경로**
- `L` (Local): 라우터 자신의 인터페이스 IP를 나타내는 **/32 호스트 경로** — 라우터가 "이 IP는 나 자신이다"라고 인식하는 데 사용

> 구버전 IOS에서는 `L` 경로가 표시되지 않고 `C`만 나타납니다.

### show ip route 출력 읽는 법

라우팅 테이블 출력은 모든 문서에서 반복적으로 등장하므로, 읽는 법을 정리합니다.

```
S     192.168.2.0/24 [1/0] via 192.168.12.2, 00:00:30, GigabitEthernet0/1
│     │               │ │       │               │         │
│     │               │ │       │               │         └─ 송신 인터페이스
│     │               │ │       │               └─ 경로 학습 후 경과 시간
│     │               │ │       └─ 넥스트 홉 IP 주소
│     │               │ └─ 메트릭 (경로 비용, 프로토콜마다 기준이 다름)
│     │               └─ AD (Administrative Distance)
│     └─ 목적지 네트워크/프리픽스 길이
└─ 경로 소스 코드
```

**주요 경로 소스 코드:**

| 코드 | 의미 | 설명 |
|------|------|------|
| `C` | Connected | 직접 연결된 네트워크 |
| `L` | Local | 라우터 자신의 인터페이스 IP (/32) |
| `S` | Static | 관리자가 수동 설정한 경로 |
| `R` | RIP | RIP으로 학습한 경로 |
| `D` | EIGRP | EIGRP로 학습한 경로 |
| `D EX` | EIGRP External | EIGRP에 재분배된 외부 경로 |
| `O` | OSPF | OSPF로 학습한 경로 |
| `O E2` | OSPF External Type 2 | OSPF에 재분배된 외부 경로 |
| `S*` | Static Default | 디폴트 스태틱 라우트 |

**`Gateway of last resort`**: 디폴트 라우트(0.0.0.0/0)가 설정되어 있으면 여기에 표시됩니다. `is not set`이면 디폴트 라우트가 없는 상태로, 라우팅 테이블에 매칭되는 항목이 없는 패킷은 드롭됩니다.

### 통신 확인

```
C:\Users\H1>ping 192.168.2.2
Pinging 192.168.2.2 with 32 bytes of data:
Reply from 192.168.2.2: bytes=32 time<1ms TTL=128
Reply from 192.168.2.2: bytes=32 time<1ms TTL=128
Reply from 192.168.2.2: bytes=32 time<1ms TTL=128
Reply from 192.168.2.2: bytes=32 time<1ms TTL=128
Ping statistics for 192.168.2.2:
    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),
```

> Windows 컴퓨터 간 핑 테스트 시 방화벽이 ICMP 트래픽을 차단할 수 있습니다.

## 라우팅 테이블을 채우는 방법

위 예시에서는 두 네트워크가 같은 라우터에 직접 연결되어 있어서 별도의 설정 없이 통신이 가능했습니다. 하지만 현실의 네트워크는 여러 라우터를 거쳐야 하는 원격 네트워크가 존재합니다. 이런 원격 네트워크에 대한 경로는 라우터가 자동으로 알 수 없으므로, 다음 방법으로 라우팅 테이블에 추가해야 합니다:

| 방법 | 설명 |
|------|------|
| **직접 연결 (Connected)** | 인터페이스에 IP를 설정하면 자동 등록 |
| **스태틱 라우트 (Static)** | 관리자가 수동으로 경로 지정 |
| **다이나믹 라우팅 프로토콜** | RIP, OSPF, EIGRP 등이 자동으로 경로 학습 |

여러 소스가 동일한 목적지에 대한 경로를 제공할 경우, 라우터는 **AD(Administrative Distance)** 값을 비교하여 가장 신뢰도 높은 경로를 선택합니다.

## Traceroute

인터넷의 서버에 접속할 때 IP 패킷은 여러 라우터를 거칩니다. `traceroute`(Windows에서는 `tracert`) 명령으로 경유하는 라우터를 확인할 수 있습니다.

```
C:\Users\Computer>tracert www.cisco.com
Tracing route to e144.dscb.akamaiedge.net [95.100.128.170]
over a maximum of 30 hops:
  1    <1 ms    <1 ms    <1 ms  192.168.154.2
  2    <1 ms    <1 ms    <1 ms  192.168.81.254
  3     9 ms     7 ms     9 ms  10.224.124.1
  4     8 ms     7 ms    10 ms  tb-rc0001-cr101-irb-201.core.as9143.net [213.51.150.129]
  5    31 ms    10 ms    13 ms  asd-lc0006-cr101-ae5-0.core.as9143.net [213.51.158.18]
  6    11 ms    12 ms    11 ms  ae1.ams10.ip4.tinet.net [77.67.64.61]
  7    11 ms    14 ms    14 ms  r22.amstnl02.nl.bb.gin.ntt.net [195.69.144.36]
  8    14 ms    15 ms    11 ms  ae-2.r03.amstnl02.nl.bb.gin.ntt.net [129.250.2.211]
  9    14 ms    11 ms    11 ms  81.20.67.150
 10    12 ms    11 ms    11 ms  95.100.128.170
Trace complete.
```

www.cisco.com에 도달하기까지 10대의 라우터를 거칩니다. 각 홉(Hop)의 IP 주소와 응답 시간이 표시되며, 호스트명 조회가 가능한 경우 라우터 이름도 확인할 수 있습니다.

| 플랫폼 | 명령어 | 사용 프로토콜 |
|--------|--------|-------------|
| Windows | `tracert` | ICMP Echo Request |
| Cisco IOS / Linux | `traceroute` | UDP (목적지 포트 33434~) |

두 방식 모두 TTL을 1부터 증가시키며 각 홉의 라우터로부터 응답을 받아 경로를 추적합니다.

### 중간 홉이 `*`(요청 시간 만료)로 표시되는 경우

```
C:\Users\qwe24>tracert www.loatodo.com

cname.vercel-dns.com [66.33.60.35](으)로 가는 경로 추적:

  1    <1 ms    <1 ms    <1 ms  172.30.1.254
  2    57 ms    39 ms     *     121.143.121.254
  3     *        1 ms     2 ms  112.190.100.49
  4     2 ms     3 ms     3 ms  112.190.111.205
  5     *        *        *     요청 시간이 만료되었습니다.
  6     *        *        *     요청 시간이 만료되었습니다.
  7     2 ms     2 ms     2 ms  112.191.117.83
  ...
 15     4 ms     3 ms     4 ms  66.33.60.35
```

중간 홉에서 `*`이 나타나는 이유는 해당 라우터가 **ICMP Time Exceeded 응답을 보내지 않도록 설정**되어 있기 때문입니다. ISP 백본이나 클라우드 인프라(AWS, Vercel 등)의 라우터는 보안 정책이나 성능상의 이유로 ICMP 응답을 차단(ACL)하거나 무시하는 경우가 많습니다.

- `*`이 나와도 **패킷은 정상적으로 통과**하고 있음 (최종 목적지에 도달했으므로)
- 해당 라우터가 "응답을 안 할 뿐" 라우팅 자체에는 문제 없음
- 마지막 목적지까지 전부 `*`로 끝나면 그때는 실제 연결 문제를 의심해야 함
