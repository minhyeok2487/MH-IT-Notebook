---
title: "OSPF 기본 설정: Router ID부터 인증까지"
date: 2026-07-27
category: Routing
subcategory: OSPF
excerpt: "Router ID를 수동으로 지정하지 않으면, 인터페이스 하나가 죽는 순간 라우터의 정체성 자체가 흔들릴 수 있다."
---

## Router ID, 왜 수동으로 지정해야 하나

Router ID를 지정하지 않으면 OSPF는 루프백 인터페이스 중 가장 높은 IP, 없으면 활성 인터페이스 중 가장 높은 IP를 자동으로 고릅니다. 문제는 그 인터페이스가 죽고 프로세스가 리셋되면 Router ID가 바뀔 수 있다는 것입니다.

Router ID가 바뀌면 LSDB에서 그 라우터의 정체가 달라지므로 토폴로지 전체가 재계산됩니다. 그래서 실무에서는 항상 `router-id`를 수동으로 고정합니다.

## Cost와 참조 대역폭

OSPF는 인터페이스 대역폭 기반의 Cost를 메트릭으로 씁니다. 참조 대역폭 기본값이 100Mbit라서, Gigabit 이상 인터페이스는 전부 Cost 1로 뭉개집니다. `auto-cost reference-bandwidth`로 전 라우터 동일하게 조정해야 합니다.

## 인증

평문 또는 MD5 인증을 인터페이스 단위·영역 단위로 걸 수 있습니다. 한쪽만 설정하면 잠시 네이버가 끊기므로 양쪽을 연속으로 적용하는 편이 안전합니다.
