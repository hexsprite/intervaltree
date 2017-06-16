import 'jest'
import { IntervalTree, Interval } from "./main"
import { bisectLeft } from './bisect'

describe("IntervalTree", () => {
  let tree: IntervalTree

  const expectTree = (value: string) => {
    expect(tree.toString()).toBe(value)
  }

  beforeEach(() => {
    tree = new IntervalTree()
  })

  afterEach(function afterEach() {
    tree.verify()
  })

  it("Should be pass sanity", () => {
    expect(typeof IntervalTree).toBe("function")
  })

  it("Should be able to create new instance", () => {
    expect(typeof new IntervalTree()).toBe("object")
  })

  it("inserts interval", () => {
    tree.addInterval(1, 5)
    expectTree("IntervalTree([Interval(1, 5)])")
  })

  it('inserts unique datapoints', () => {
    tree.addInterval(0, 3)
    tree.addInterval(0, 3, 'a')
    tree.addInterval(0, 3, 'b')
    expect(tree.allIntervals.length).toBe(3)
  })

  it("merges overlapping intervals", () => {
    tree.addInterval(1, 5)
    tree.addInterval(5, 9)
    tree.addInterval(15,19)
    tree.addInterval(19,25)    
    tree.mergeOverlaps()
    expectTree("IntervalTree([Interval(1, 9),Interval(15, 25)])")
  })

  it("merges overlapping intervals with data", () => {
    tree.addInterval(1, 5)
    tree.addInterval(5, 9)
    tree.addInterval(15,19)
    tree.addInterval(19,25, 'i')
    tree.mergeOverlaps()
    expectTree("IntervalTree([Interval(1, 9),Interval(15, 25)])")
  })

  // it("can be an array", () => {
  //   tree.addInterval(1, 5, 'hello')
  //   expect(tree.toArray()).toBe([1,5])
  // })

  it("get first and last interval", () => {
    tree.addInterval(5, 10)
    tree.addInterval(0,4)
    expect(tree.first().toString()).toBe("Interval(0, 4)")
    expect(tree.last().toString()).toBe("Interval(5, 10)")
  })

  it("chops tree", () => {
    tree.addInterval(0, 10)
    tree.chop(3, 7)
    expectTree("IntervalTree([Interval(0, 3),Interval(7, 10)])")
  })

  it('chops bigger things', () => {   
    let allIntervals = [
      [1481157540000, 1481158800000],
      [1481216400000, 1481234400000],
      [1481239800000, 1481245200000],
      [1481302800000, 1481320800000],
      [1481326200000, 1481331600000],
      [1481389200000, 1481418000000],
      [1481475600000, 1481504400000],
      [1481562000000, 1481580000000],
      [1481585400000, 1481590800000],
      [1481648400000, 1481677200000],
      [1481734800000, 1481752800000],
      [1481758200000, 1481763600000],
      [1481821200000, 1481839200000],
      [1481844600000, 1481850000000],
      [1481907600000, 1481936400000],
      [1481994000000, 1482022800000],
      [1482080400000, 1482109200000],
      [1482166800000, 1482195600000],
      [1482253200000, 1482282000000],
      [1482253200000, 1483344000000]
    ]
    tree.initFromSimpleArray(allIntervals)
    tree.chop(1482220800000, 1482253200000)
  })

  it("chops in the past", () => {
    let allIntervals = [
      [227833200000, 227840400000],
      [227923200000, 227926800000],
      [227984400000, 228013200000],
      [228070800000, 228099600000],
      [228157200000, 228186000000],
      [228416400000, 228445200000],
      [228502800000, 228531600000],
      [228589200000, 228618000000],
      [228675600000, 228704400000],
      [228762000000, 228790800000],
      [229021200000, 229050000000]]
    tree.initFromSimpleArray(allIntervals)
    tree.chop(0, 227923200000)
    expect(tree.first().start).toBe(227923200000)
  })

  it("find intervals of minimum length", () => {
    tree.addInterval(0,1)
    tree.addInterval(2,4)
    tree.addInterval(5,8)
    tree.addInterval(9,13)
    tree.addInterval(14,19)
    expect(tree.searchByLengthStartingAt(3, 0).toString())
    .toBe("Interval(5, 8),Interval(9, 13),Interval(14, 19)")

    expect(tree.searchByLengthStartingAt(3, 9).toString())
    .toBe("Interval(9, 13),Interval(14, 19)")
  })

  it('clone', ()=> {
    tree.addInterval(0,1)
    tree.addInterval(2,4)
    tree.addInterval(5,8)
    tree.addInterval(9,13)
    let cloned = tree.clone()
    expect(cloned.toString()).toBe(tree.toString())
  })

  it('search bugs', () => {
    tree.initFromSimpleArray([
      [1483315500000, 1483318800000, 'hb3u3ztHuvPttf7dD'],
      [1483387200000, 1483394400000, null],
      [1483399800000, 1483405200000, '56NL2yqQJMhZ4w4dD'],
      [1483462800000, 1483480800000, 'fK3PPyXJss2g4LKWi'],
      [1483486200000, 1483491600000, 'qXnxZZa5yjeEPtT4z'],
      [1483549200000, 1483567200000, 'FMrcgBLxHSnvdsxao'],
      [1483572600000, 1483578000000, 'p8SFaNDiYZDfweknu'],
      [1483635600000, 1483653600000, 'sTijSr5vv8547KopH'],
      [1483659000000, 1483664400000, 'o2BiALLdKb56getkD'],
      [1483722000000, 1483740000000, 'BQxTPexLBK9S7e5JQ'],
      [1483745400000, 1483750800000, 'BsnAJnyLqCx8MzNqe'],
      [1483808400000, 1483837200000, 'PauxpTjuhZYpWfpu4'],
      [1483894800000, 1483923600000, 'v9jid69q9jjneSmFW'],
      [1483981200000, 1483999200000, 'M8G8wBXzqzCxX8yFh'],
      [1484004600000, 1484010000000, 'KD5Cb3Cu2ZBGJ9r6g'],
      [1484067600000, 1484085600000, 'bRyNQepujF78AAFCF'],
      [1484091000000, 1484096400000, '4uAJHFrSfQDoeJEZH'],
      [1484154000000, 1484172000000, 'ZNNrQEdmsdEnJe6zc'],
      [1484177400000, 1484182800000, 'CaaugipzJX3sXB4wP'],
      [1484240400000, 1484258400000, 'Zb9z5vKiGZ6BSC5pX'],
      [1484263800000, 1484269200000, 'MbSdt5N4XMTJ88uGt'],
      [1484326800000, 1484344800000, 'ib7YL6tSt5ZWPd8rL'],
      [1484350200000, 1484355600000, 'jCNZXuX8hrNnWvZpS'],
      [1484413200000, 1484442000000, 'null']
    ])
    // expect(tree.search(1483315556345, Infinity)).toBe('')
    expect(tree.searchByLengthStartingAt(3600000, 1483315556345).toString())
    .toBe("Interval(1483387200000, 1483394400000),Interval(1483399800000, 1483405200000, 56NL2yqQJMhZ4w4dD),Interval(1483462800000, 1483480800000, fK3PPyXJss2g4LKWi),Interval(1483486200000, 1483491600000, qXnxZZa5yjeEPtT4z),Interval(1483549200000, 1483567200000, FMrcgBLxHSnvdsxao),Interval(1483572600000, 1483578000000, p8SFaNDiYZDfweknu),Interval(1483635600000, 1483653600000, sTijSr5vv8547KopH),Interval(1483659000000, 1483664400000, o2BiALLdKb56getkD),Interval(1483722000000, 1483740000000, BQxTPexLBK9S7e5JQ),Interval(1483745400000, 1483750800000, BsnAJnyLqCx8MzNqe),Interval(1483808400000, 1483837200000, PauxpTjuhZYpWfpu4),Interval(1483894800000, 1483923600000, v9jid69q9jjneSmFW),Interval(1483981200000, 1483999200000, M8G8wBXzqzCxX8yFh),Interval(1484004600000, 1484010000000, KD5Cb3Cu2ZBGJ9r6g),Interval(1484067600000, 1484085600000, bRyNQepujF78AAFCF),Interval(1484091000000, 1484096400000, 4uAJHFrSfQDoeJEZH),Interval(1484154000000, 1484172000000, ZNNrQEdmsdEnJe6zc),Interval(1484177400000, 1484182800000, CaaugipzJX3sXB4wP),Interval(1484240400000, 1484258400000, Zb9z5vKiGZ6BSC5pX),Interval(1484263800000, 1484269200000, MbSdt5N4XMTJ88uGt),Interval(1484326800000, 1484344800000, ib7YL6tSt5ZWPd8rL),Interval(1484350200000, 1484355600000, jCNZXuX8hrNnWvZpS),Interval(1484413200000, 1484442000000, null)")
  })
  
  it('chop bugs', () => {
    tree.initFromSimpleArray([
      [1406304000000, 1406332800000],
      [1406324425000, 1406328025000],
      [1406328025000, 1406335225000],
      [1406563200000, 1406592000000],
      [1406649600000, 1406678400000],
      [1406736000000, 1406764800000],
      [1406822400000, 1406851200000],
      [1406908800000, 1406937600000],
      [1407168000000, 1407196800000],
      [1407254400000, 1407283200000],
      [1407340800000, 1407369600000],
      [1407427200000, 1407456000000]
    ])
    tree.chop(1406271600000, 1406304000000)
    tree.chop(1406332800000, 1406358000000)
    tree.chop(1406358000000, 1406444400000)
    tree.chop(1406444400000, 1406530800000)
    tree.chop(1406530800000, 1406563200000)
    tree.chop(1406592000000, 1406617200000)
    tree.chop(1406617200000, 1406649600000)
    tree.chop(1406678400000, 1406703600000)
    tree.chop(1406703600000, 1406736000000)
    tree.chop(1406764800000, 1406790000000)
    tree.chop(1406790000000, 1406822400000)
    tree.chop(1406851200000, 1406876400000)
    tree.chop(1406876400000, 1406908800000)
    tree.chop(1406937600000, 1406962800000)
    tree.chop(1406962800000, 1407049200000)
    tree.chop(1407049200000, 1407135600000)
    tree.chop(1407135600000, 1407168000000)
    tree.chop(1407196800000, 1407222000000)
    tree.chop(1407222000000, 1407254400000)
  })

  it('FOC-209 removeEnveloped RangeError', () => {
    debugger;
    tree.initFromSimpleArray([
      [ 1496948100000, 1496948400000, 'PfcyAB6iRmDxbfGSF'],
      [ 1496948100000, 1496948400000 ]
    ])
    tree.removeEnveloped(0, 1496948400000)
  })

  it('verifies empty', () => {
    tree.verify()
  })

  it('verifies with content', () => {
    tree.initFromSimpleArray([
      [1,2],
      [3,4],
      [5,6]
    ])
    tree.verify()
  })

  it('bisectInterval', () => {
    expect(bisectLeft([0,1,2,3,4,5], 5)).toBe(5)
    expect(bisectLeft([0,1,2,3,4,5], 10)).toBe(6)
    expect(bisectLeft([0,1,2,3,4,5], -1)).toBe(0)
  })

  it('JSON serialization', () => {
    tree.addInterval(1,2, 'data')
    tree.addInterval(3,4)
    const json = JSON.stringify(tree)
    let tree2 = IntervalTree.fromJSON(json)
    expect(tree.allIntervals.equals(tree2.allIntervals)).toBe(true)
  })

  it('hashing', () => {
    tree.addInterval(1,2, 'data')
    tree.addInterval(3,4)
    let tree2 = tree.clone()    
    expect(tree.hash()).toBe(tree2.hash())
  })
})
